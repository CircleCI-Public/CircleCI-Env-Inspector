import axios, { AxiosInstance } from "axios";
import https from "https";

import { printError, printMessage, printWarning } from "./Utils";

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
    const repos = await this._getPaginated<CircleCIAPIRepo>(
      `${CircleCI.endpoint.private}/project?organization-id=${orgID}`
    );
    return repos;
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
    const { data } = await this._client.get<CircleCIAPIProject>(
      `${CircleCI.endpoint.v2}/project/${slug}`
    );
    const project: CircleCIProject = {
      ...data,
      variables: await this.getProjectVariables(slug),
      keys: await this.getProjectKeys(slug),
      legacyAWSKeys: await this.getLegacyAWSKeys(slug),
    };
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

  async getContexts(orgID: string, slug: string): Promise<CircleCIContext[]> {
    printMessage("...", "Fetching contexts");
    const contextsReport: CircleCIContext[] = [];
    const contexts = await this._getPaginated<CircleCIAPIContext>(
      `${CircleCI.endpoint.v2}/context?owner-id=${orgID}`
    ).catch((e) => {
      printError(e.message, "Error fetching contexts", 2);
      printWarning("Skipping contexts", "Warning", 2);
      return [];
    });
    printMessage(`${contexts.length}`, "Contexts found:");

    for (let i = 0; i < contexts.length; i++) {
      printMessage(
        `${contexts[i].name} ${i + 1}/${contexts.length}`,
        `Fetching context variables for:`,
        2
      );
      let variables: CircleCIAPIContextVariable[] = [];
      try {
        variables = await this._getPaginated<CircleCIAPIContextVariable>(
          `${CircleCI.endpoint.v2}/context/${contexts[i].id}/environment-variable`
        );
      } catch (e) {
        printError(`${e}`, "Error fetching context variables: ", 2);
        printError("Skipping context variables", "Warning: ", 2);
      }
      contextsReport.push({
        ...contexts[i],
        url: `https://circleci.com/${slug}/contexts/${contexts[i].id}`,
        variables: variables,
      });
    }
    return contextsReport;
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
  legacyAWSKeys: CircleCILegacyAWSKeyPair;
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
