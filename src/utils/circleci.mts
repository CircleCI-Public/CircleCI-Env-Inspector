import { exitWithError, fetchWithToken } from "./utils.mjs";

export const CIRCLE_V1_API =
  process.env.CIRCLE_V1_API ?? "https://circleci.com/api/v1.1";

export const CIRCLE_V2_API =
  process.env.CIRCLE_V2_API ?? "https://circleci.com/api/v2";

export type CircleCICollaboration = {
  id: string;
  name: string;
  vcs_type: string;
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
};

export type CircleCIContext = {
  name: string;
  id: string;
  variables: CircleCIContextVariable[];
};

export type CircleCIProjectVariable = {
  name: string;
  value: string;
};

export type CircleCIProject = {
  name: string;
  variables: CircleCIProjectVariable[];
};

export type CircleCIResponseRepo = {
  reponame: string;
  username: string;
  vcs_url: string;
};

export async function getContextVariables(
  token: string,
  contextID: string,
  pageToken: string
) {
  const url = pageToken
    ? `${CIRCLE_V2_API}/context/${contextID}/environment-variable?page-token=${pageToken}`
    : `${CIRCLE_V2_API}/context/${contextID}/environment-variable`;
  return fetchWithToken<CircleCIContextVariable[]>(url, token, "circleci");
}

export async function getCollaborations(token: string) {
  const url = `${CIRCLE_V2_API}/me/collaborations`;
  return await fetchWithToken<CircleCICollaboration[]>(url, token, "circleci");
}

export async function getContexts(
  token: string,
  ownerID: string,
  pageToken: string
) {
  const url = pageToken
    ? `${CIRCLE_V2_API}/context?owner-id=${ownerID}&page-token=${pageToken}`
    : `${CIRCLE_V2_API}/context?owner-id=${ownerID}`;
  return fetchWithToken<CircleCIContext[]>(url, token, "circleci");
}

export const getCircleCIRepos = async (secretToken: string) => {
  return fetchWithToken<CircleCIResponseRepo[]>(
    `${CIRCLE_V1_API}/projects`,
    secretToken,
    "circleci"
  );
};

export async function getProjectVariables(
  token: string,
  repo: string,
  vcs: string,
  wait = 0
) {
  const url = `${CIRCLE_V2_API}/project/${vcs}/${repo}/envvar`;
  return fetchWithToken<CircleCIProjectVariable[]>(
    url,
    token,
    "circleci",
    wait
  );
}

export type CircleCIAccount = {
  vcs_type: string;
  slug: string;
  id: string;
  avatar_url: string;
};

export async function getAccounts(token: string): Promise<CircleCIAccount[]> {
  const collaborations = await getCollaborations(token);
  if (!collaborations.response.ok) {
    exitWithError(
      "Failed to fetch CircleCI Accounts: ",
      collaborations.response
    );
  } else if (
    !collaborations.responseBody ||
    collaborations.responseBody.length === 0
  ) {
    exitWithError("No CircleCI accounts found");
  }
  return collaborations.responseBody;
}
