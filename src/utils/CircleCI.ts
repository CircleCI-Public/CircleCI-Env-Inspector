import axios, { AxiosInstance } from "axios";
import https from "https";

import {
  createMinimalAxiosError,
  getAxiosError,
  printAxiosError,
  printMessage,
  printWarning,
} from "./Utils";

export class CircleCI {
  static readonly endpoint = {
    v1: "https://circleci.com/api/v1.1",
    v2: "https://circleci.com/api/v2",
    private: "https://circleci.com/api/private",
  };
  private _client: AxiosInstance;

  constructor(token: string) {
    this._client = axios.create({
      headers: {
        "Circle-Token": token,
      },
      httpsAgent: new https.Agent({
        keepAlive: true,
      }),
      maxRedirects: 3,
    });
  }

  async getAuthenticatedUser(): Promise<CircleCIAPIUser> {
    const response = await this._client
      .get<CircleCIAPIUser>(`${CircleCI.endpoint.v2}/me`)
      .catch((e) => {
        const error = getAxiosError(e);
        printAxiosError(error, 2, "Authentication failed:");
        throw error;
      });
    return response.data;
  }

  /**
   * Fetches paginated data from the CircleCI API
   * @param url - The endpoint to fetch
   * @param pageToken - The next page token to fetch
   */
  private async _getPaginated<T>(url: string): Promise<T[]> {
    const pagedData: T[] = [];
    let pageToken;
    do {
      const remote: string = pageToken ? `${url}&page-token=${pageToken}` : url;
      const {
        data: { items, next_page_token },
      } = await this._client.get<CircleCIPaginatedAPIResponse<T>>(remote);
      pagedData.push(...items);
      pageToken = next_page_token;
    } while (pageToken);
    return pagedData;
  }

  async getCollaborations(): Promise<CircleCIAPICollaboration[]> {
    const { data } = await this._client.get<CircleCIAPICollaboration[]>(
      `${CircleCI.endpoint.v2}/me/collaborations`
    );
    return data;
  }

  /**
   * Fetches all repos for a given organization
   * Appears to fetch all repos CircleCI has seen previously
   *   Some repos may not be setup on CircleCI or exist anymore.
   * @param orgID - The organization ID
   * @returns An array of repos
   */
  private async _getRepos(orgID: string): Promise<CircleCIAPIRepo[]> {
    // Bugfix: Reported in #44 (https://github.com/CircleCI-Public/CircleCI-Env-Inspector/pull/44)
    // CircleCI's /api/private/project endpoint appears to have a bug where a small
    //   number of users are seeing paginated results returned in an infinite loop.
    // This special case is to prevent that from happening.
    // This code is what would be normally used to fetch repos
    // const repos = await this._getPaginated<CircleCIAPIRepo>(
    //   `${CircleCI.endpoint.private}/project?organization-id=${orgID}`
    // );
    // return repos;
    const pagedData: CircleCIAPIRepo[] = [];
    const intersection: CircleCIAPIRepo[] = [];
    const url = `${CircleCI.endpoint.private}/project?organization-id=${orgID}&include-deleted=true`;
    let pageToken;
    do {
      const remote: string = pageToken ? `${url}&page-token=${pageToken}` : url;
      const {
        data: { items, next_page_token },
      } = await this._client.get<CircleCIPaginatedAPIResponse<CircleCIAPIRepo>>(
        remote
      );
      for (const item of items) {
        if (pagedData.find((i) => i.slug === item.slug)) {
          intersection.push(item);
        } else {
          pagedData.push(item);
        }
      }
      if (intersection.length > 0) {
        printWarning(
          "The API appears to be returning duplicate repos. This is a known bug. Please contact support. We have stopped fetching repositories to prevent an infinite loop."
        );
        break;
      }
      pageToken = next_page_token;
    } while (pageToken);
    return pagedData;
  }

  async getProject(repo: CircleCIAPIRepo): Promise<CircleCIProject> {
    const errors: ProjectError[] = [];
    const { data: projectSecrets } = await this._client
      .get<CircleCIAPIPrivateProject>(
        `${CircleCI.endpoint.private}/project/${repo.id}?include-deleted=true`
      )
      .catch((e) => {
        const error = getAxiosError(e);
        printAxiosError(error, 2);
        errors.push({
          error: createMinimalAxiosError(error),
          projectSlug: repo.slug,
          url: `${CircleCI.endpoint.private}/project/${repo.id}`,
        });

        const project: CircleCIAPIPrivateProject = {
          project_env_vars: [],
          checkout_keys: [],
          ssh_keys: [],
          legacy_aws_keys: {
            access_key_id: "",
            secret_access_key: "",
          },
        };

        return {
          data: project,
        };
      });

    const project: CircleCIProject = {
      errors,
      ...repo,
      ...projectSecrets,
    };
    return project;
  }

  async getProjects(orgID: string) {
    const repos = await this._getRepos(orgID);
    const projects: CircleCIProject[] = [];
    for (let i = 0; i < repos.length; i++) {
      printMessage(
        `${repos[i].name} ${i + 1}/${repos.length}`,
        "Fetching project details for:",
        2
      );
      try {
        const sleepInput = process.env.CCI_ENV_INSPECTOR_DELAY || "0";
        const sleepTime = parseInt(sleepInput);
        if (sleepTime > 0) {
          console.log(`  Sleeping for ${sleepTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        }
        const project = await this.getProject(repos[i]);
        projects.push(project);
      } catch (e: unknown) {
        if (e instanceof Error) {
          const erroredProject: CircleCIProject = {
            checkout_keys: [],
            ssh_keys: [],
            project_env_vars: [],
            id: repos[i].id,
            name: repos[i].name,
            slug: repos[i].slug,
            errors: [
              {
                url: `https://circleci.com/${repos[i].slug}`,
                projectSlug: repos[i].slug,
                error: {
                  message: "Failed to fetch project",
                  status: 0,
                  code: `${e.name} ${e.message}`,
                  statusText: "Internal Server Error",
                  url: `https://circleci.com/${repos[i].slug}`,
                },
              },
            ],
          };
          projects.push(erroredProject);
        } else {
          console.log(`Unknown error fetching project ${repos[i].slug}:`);
          console.dir(e, { depth: null });
        }
      }
      return projects;
    }
  }

  getContextUrl(slug: string, contextID: string) {
    return `https://circleci.com/${slug}/contexts/${contextID}`;
  }

  async getContexts(orgID: string, slug: string) {
    const errors: ContextVariableError[] = [];
    printMessage("...", "Fetching contexts");
    const contextsReport: CircleCIContext[] = [];
    const contexts = await this._getPaginated<CircleCIAPIContext>(
      `${CircleCI.endpoint.v2}/context?owner-id=${orgID}`
    ).catch((e) => {
      const error = getAxiosError(e);
      printAxiosError(error, 2);
      printWarning("Skipping contexts", 2);
      errors.push({
        contextName: "",
        url: "",
        error: createMinimalAxiosError(error),
      });
      return [];
    });
    printMessage(`${contexts.length}`, "Contexts found:");

    for (let i = 0; i < contexts.length; i++) {
      printMessage(
        `${contexts[i].name} ${i + 1}/${contexts.length}`,
        `Fetching context variables for:`,
        2
      );
      const variables: CircleCIAPIContextVariable[] =
        await this._getPaginated<CircleCIAPIContextVariable>(
          `${CircleCI.endpoint.v2}/context/${contexts[i].id}/environment-variable`
        ).catch((e) => {
          const error = getAxiosError(e);
          printAxiosError(error, 2);
          printWarning("Skipping context variables", 2);
          errors.push({
            contextName: contexts[i].name,
            url: this.getContextUrl(slug, contexts[i].id),
            error: createMinimalAxiosError(error),
          });
          return [];
        });
      contextsReport.push({
        ...contexts[i],
        url: this.getContextUrl(slug, contexts[i].id),
        variables: variables,
      });
    }
    return {
      errors,
      contextsReport,
    };
  }
}

// Types
export type CircleCIAPIUser = {
  name: string;
  login: string;
  id: string;
  avatar_url: string;
};
type VCS_TYPE = "github" | "bitbucket" | "circleci";
type CircleCIPaginatedAPIResponse<T> = {
  items: T[];
  next_page_token: string;
};
export type CircleCIAPICollaboration = {
  id: string;
  name: string;
  vcs_type: VCS_TYPE;
  avatar_url: string;
  slug: string;
};
type CircleCIAPIContext = {
  id: string;
  name: string;
  created_at: string;
};
interface CircleCIContext extends CircleCIAPIContext {
  url: string;
  variables: CircleCIAPIContextVariable[];
}
type CircleCIAPIContextVariable = {
  variable: string;
  context_id: string;
  created_at: string;
  updated_at: string;
};
type CircleCIAPIProjectVariable = {
  name: string;
  value: string;
};
type CircleCIAPIRepo = {
  id: string;
  name: string;
  slug: string;
  has_trigger: boolean;
};
// An internally created API to more easily fetch project secrets
type CircleCIAPIPrivateProject = {
  project_env_vars: CircleCIAPIProjectVariable[];
  checkout_keys: CircleCIProjectCheckoutKey[];
  ssh_keys: CircleCIProjectSSHKey[];
  legacy_aws_keys?: CircleCILegacyAWSKeyPair;
};
interface CircleCIProject extends CircleCIAPIPrivateProject {
  id: string;
  name: string;
  slug: string;
  errors?: ProjectError[];
}

type CircleCIProjectCheckoutKey = {
  created_at: string;
  fingerprint: string;
  preferred: boolean;
  public_key: string;
  type: "deploy-key" | "github-user-key";
};

type CircleCIProjectSSHKey = {
  fingerprint: string;
  hostname: string;
  public_key: string;
};

export type CircleCIEnvInspectorReport = {
  user: CircleCIAPIUser;
  accounts: CircleCIAccountReport[];
};
export type CircleCIAccountReport = {
  name: string;
  id: string;
  vcstype: VCS_TYPE;
  contexts: CircleCIContext[];
  projects: CircleCIProject[];
  errors: unknown[];
};

type CircleCILegacyAWSKeyPair = {
  access_key_id: string;
  secret_access_key: string;
};

type ContextVariableError = {
  contextName: string;
  url: string;
  error: AxiosErrorMinimal;
};

type ProjectError = {
  projectSlug: string;
  url: string;
  error: AxiosErrorMinimal;
};

export type AxiosErrorMinimal = {
  message: string;
  code: string;
  status: number;
  statusText: string;
  url: string;
};
