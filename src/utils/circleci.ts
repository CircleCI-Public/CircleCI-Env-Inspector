import { Response } from "node-fetch";

import { fetchWithToken, VCS_TYPE } from "./utils";

export type CircleCIEnvInspectorReport = {
  [name: string]: CircleCIAccountData;
};

export type CircleCIAccountData = {
  contexts: CircleCIContext[];
  projects: {
    name: string;
    url: string;
    variables: CircleCIProjectVariable[];
    project_keys: CircleCIProjectKey[];
  }[];
  unavailable: string[];
};

export const CIRCLE_API_HOST = "https://circleci.com";
export const CIRCLE_API_PRIVATE = `${CIRCLE_API_HOST}/api/private`;
export const CIRCLE_V1_API =
  process.env.CIRCLE_V1_API ?? `${CIRCLE_API_HOST}/api/v1.1`;
export const CIRCLE_V2_API =
  process.env.CIRCLE_V2_API ?? `${CIRCLE_API_HOST}/api/v2`;

export type CircleCICollaboration = {
  id: string;
  name: string;
  vcs_type: VCS_TYPE;
  avatar_url: string;
  slug: string;
};

export type CircleCIPaginatedAPIResponse<T> = {
  items: T[];
  next_page_token: string;
};

export type CircleCIContextVariable = {
  variable: string;
  context_id: string;
  created_at: string;
  error?: string;
};

export type CircleCIContext = {
  name: string;
  id: string;
  url: string;
  variables: CircleCIContextVariable[];
};

export type CircleCIProjectVariable = {
  name: string;
  value: string;
  error?: string;
};

export type CircleCIProjectKey = {
  type: string;
  preferred: string;
  created_at: string;
  public_key: string;
  fingerprint: string;
  error?: string;
};

export type CircleCIResponseRepo = {
  id: string;
  name: string;
  slug: string;
  has_trigger: boolean;
};

export async function getContextVariables(
  token: string,
  contextID: string,
  pageToken: string
): Promise<{
  response: Response;
  responseBody: CircleCIPaginatedAPIResponse<CircleCIContextVariable>;
}> {
  const url = pageToken
    ? `${CIRCLE_V2_API}/context/${contextID}/environment-variable?page-token=${pageToken}`
    : `${CIRCLE_V2_API}/context/${contextID}/environment-variable`;
  return fetchWithToken<CircleCIPaginatedAPIResponse<CircleCIContextVariable>>(
    url,
    token,
    "circleci"
  );
}

export async function getCollaborations(token: string) {
  const url = `${CIRCLE_V2_API}/me/collaborations`;
  return await fetchWithToken<CircleCICollaboration[]>(url, token, "circleci");
}

export async function getContexts(
  token: string,
  ownerID: string,
  pageToken: string
): Promise<{
  response: Response;
  responseBody: CircleCIPaginatedAPIResponse<CircleCIContext>;
}> {
  const url = pageToken
    ? `${CIRCLE_V2_API}/context?owner-id=${ownerID}&page-token=${pageToken}`
    : `${CIRCLE_V2_API}/context?owner-id=${ownerID}`;

  return await fetchWithToken<CircleCIPaginatedAPIResponse<CircleCIContext>>(
    url,
    token,
    "circleci"
  );
}

export const getCircleCIRepos = async (
  secretToken: string,
  orgID: string,
  pageToken: string
) => {
  const url = pageToken
    ? `${CIRCLE_API_PRIVATE}/project?organization-id=${orgID}&page-token=${pageToken}`
    : `${CIRCLE_API_PRIVATE}/project?organization-id=${orgID}`;
  return fetchWithToken<CircleCIPaginatedAPIResponse<CircleCIResponseRepo>>(
    url,
    secretToken,
    "circleci"
  );
};

export async function getProjectVariables(
  token: string,
  slug: string,
  pageToken: string
): Promise<{
  response: Response;
  responseBody: CircleCIPaginatedAPIResponse<CircleCIProjectVariable>;
}> {
  const url = pageToken
    ? `${CIRCLE_V2_API}/project/${slug}/envvar`
    : `${CIRCLE_V2_API}/project/${slug}/envvar?page-token=${pageToken}`;
  return fetchWithToken<CircleCIPaginatedAPIResponse<CircleCIProjectVariable>>(
    url,
    token,
    "circleci"
  );
}
export async function getSSHKeys(
  token: string,
  slug: string,
  pageToken: string
): Promise<{
  response: Response;
  responseBody: CircleCIPaginatedAPIResponse<CircleCIProjectKey>;
}> {
  const url = pageToken
    ? `${CIRCLE_V2_API}/project/${slug}/checkout-key?page-token=${pageToken}`
    : `${CIRCLE_V2_API}/project/${slug}/checkout-key`;
  return fetchWithToken<CircleCIPaginatedAPIResponse<CircleCIProjectKey>>(
    url,
    token,
    "circleci"
  );
}
