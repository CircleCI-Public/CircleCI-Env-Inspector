import axios, { AxiosInstance } from "axios";
import https from "https";

import { printMessage } from "./Utils";

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
  async getRepos(orgID: string): Promise<CircleCIAPIRepo[]> {
    const repos = await this._getPaginated<CircleCIAPIRepo>(
      `${CircleCI.endpoint.private}/project?organization-id=${orgID}`
    );
    return repos;
  }

  async getContexts(orgID: string): Promise<CircleCIContext[]> {
    printMessage("...", "Fetching contexts");
    const contexts = await this._getPaginated<CircleCIAPIContext>(
      `${CircleCI.endpoint.v2}/context?owner-id=${orgID}`
    );
    printMessage(`${contexts.length}`, "Contexts found:");
    return contexts;
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
export type CircleCIAPIProjectKey = {
  type: string;
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
export type CircleCIProject = {
  id: string;
  name: string;
  slug: string;
  variables: CircleCIAPIProjectVariable[];
  keys: CircleCIAPIProjectKey[];
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
