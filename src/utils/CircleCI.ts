import axios, { AxiosError, AxiosInstance } from "axios";
import https from "https";

import {
  createMinimalAxiosError,
  getAxiosError,
  printAxiosError,
  printError,
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
    const response = await this._client.get<CircleCIAPIUser>(
      `${CircleCI.endpoint.v2}/me`
    );
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
    const url = `${CircleCI.endpoint.private}/project?organization-id=${orgID}`;
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

  async getLegacyAWSKeys(slug: string): Promise<CircleCILegacyAWSKeyPair> {
    const {
      data: {
        aws: { keypair },
      },
    } = await this._client.get<CircleCIAPIv1ProjectSettings>(
      `${CircleCI.endpoint.v1}/project/${slug}/settings`
    );
    if (keypair) {
      printError(
        "You have legacy AWS credentials stored in this project. We recommend immediately deleting these keys.",
        "Legacy AWS Keys Found!:",
        4
      );
    }
    return keypair;
  }

  async getProject(slug: string): Promise<CircleCIProject> {
    const errors: ProjectError[] = [];
    const { data } = await this._client.get<CircleCIAPIProject>(
      `${CircleCI.endpoint.v2}/project/${slug}`
    );
    const variables: CircleCIAPIProjectVariable[] =
      await this.getProjectVariables(slug).catch((e) => {
        const error = getAxiosError(e);
        printAxiosError(error, 4, "Failed to fetch project variables");
        const projectError: ProjectError = {
          projectSlug: slug,
          url: `https://app.circleci.com/settings/project/${slug}/environment-variables`,
          error: createMinimalAxiosError(error),
        };
        errors.push(projectError);
        return [];
      });
    const projectKeys: CircleCIAPIProjectCheckoutKey[] =
      await this.getProjectKeys(slug).catch((e) => {
        const error = getAxiosError(e);
        printAxiosError(error, 4, "Failed to fetch project keys");
        const projectError: ProjectError = {
          projectSlug: slug,
          url: `https://app.circleci.com/settings/project/${slug}/ssh`,
          error: createMinimalAxiosError(error),
        };
        errors.push(projectError);
        return [];
      });
    const legacyAWSKeys = await this.getLegacyAWSKeys(slug).catch((e) => {
      const error = getAxiosError(e);

      printAxiosError(error, 4, "Failed to fetch legacy AWS keys");
      const projectError: ProjectError = {
        projectSlug: slug,
        url: `https://app.circleci.com/settings/project/${slug}/`,
        error: createMinimalAxiosError(error),
      };
      errors.push(projectError);
      return undefined;
    });
    const project: CircleCIProject = {
      ...data,
      variables: variables,
      keys: projectKeys,
    };
    if (legacyAWSKeys) {
      project.legacyAWSKeys = legacyAWSKeys;
    }
    if (errors.length > 0) {
      project.errors = errors;
    }
    return project;
  }
  async getProjectVariables(
    slug: string
  ): Promise<CircleCIAPIProjectVariable[]> {
    const variables = await this._getPaginated<CircleCIAPIProjectVariable>(
      `${CircleCI.endpoint.v2}/project/${slug}/envvar`
    );
    printMessage(`${variables.length}`, "Variables found:", 4);
    return variables;
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
      const project = await this.getProject(repos[i].slug);
      projects.push(project);
    }
    return projects;
  }

  async getProjectKeys(slug: string): Promise<CircleCIAPIProjectCheckoutKey[]> {
    const keys = await this._getPaginated<CircleCIAPIProjectCheckoutKey>(
      `${CircleCI.endpoint.v2}/project/${slug}/checkout-key`
    );
    printMessage(`${keys.length}`, "Keys found:", 4);
    return keys;
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
export type VCS_TYPE = "github" | "bitbucket" | "circleci";
export type CircleCIPaginatedAPIResponse<T> = {
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
export type CircleCIAPIContext = {
  id: string;
  name: string;
  created_at: string;
};
export interface CircleCIContext extends CircleCIAPIContext {
  url: string;
  variables: CircleCIAPIContextVariable[];
}
export type CircleCIAPIContextVariable = {
  variable: string;
  context_id: string;
  created_at: string;
  updated_at: string;
};
export type CircleCIAPIProjectVariable = {
  name: string;
  value: string;
};
export type CircleCIAPIProjectCheckoutKey = {
  type: "deploy-key" | "github-user-key";
  preferred: string;
  created_at: string;
  public_key: string;
  fingerprint: string;
};
export type CircleCIAPIRepo = {
  id: string;
  name: string;
  slug: string;
  has_trigger: boolean;
};
export type CircleCIAPIProject = {
  slug: string;
  name: string;
  id: string;
  organization_name: string;
  organization_id: string;
  organization_slug: string;
  vcs_info: {
    vcs_url: string;
    provider: VCS_TYPE;
    default_branch: string;
  };
};
export type CircleCIProject = {
  id: string;
  name: string;
  slug: string;
  variables: CircleCIAPIProjectVariable[];
  keys: CircleCIAPIProjectCheckoutKey[];
  legacyAWSKeys?: CircleCILegacyAWSKeyPair;
  errors?: ProjectError[];
};
export type CircleCICollabData = {
  name: string;
  slug: string;
  contexts: CircleCIContext[];
  projects: CircleCIProject[];
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
export type CircleCIAPIv1ProjectSettings = {
  aws: {
    keypair: CircleCILegacyAWSKeyPair;
  };
  vcstype: VCS_TYPE;
  slack_webhook_url: string;
};
export type CircleCILegacyAWSKeyPair = {
  access_key_id: string;
  secret_access_key: string;
};

export type ContextVariableError = {
  contextName: string;
  url: string;
  error: AxiosErrorMinimal;
};

export type ProjectError = {
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
