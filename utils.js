import fetch from "node-fetch";

export function exitWithError(message, ...optionalParams) {
  console.error(message, optionalParams);
  process.exit(1);
}

export async function getCollaborations(api, token) {
  const url = `${api}/me/collaborations`;
  return await fetchWithToken(url, token, "circleci");
};

export async function getContexts(api, token, ownerID, pageToken) {
  const url = pageToken ? `${api}/context?owner-id=${ownerID}&page-token=${pageToken}` : `${api}/context?owner-id=${ownerID}`;
  return fetchWithToken(url, token, "circleci");
};

export async function getContextVariables(api, token, contextID, pageToken) {
  const url = pageToken ? `${api}/context/${contextID}/environment-variable?page-token=${pageToken}` : `${api}/context/${contextID}/environment-variable`;
  return fetchWithToken(url, token, "circleci");
}

export async function getRepos(api, token, slug, accountID, pageToken) {
  const url = api.includes("github")
    ? `${api}/${slug}/${accountID}/repos?per_page=100&page=${pageToken}`
    : `${api}/projects`;
  return api.includes("github") ? fetchWithToken(url, token, "github") : fetchWithToken(url, token, "circleci");
}

export async function getProjectVariables(api, token, repo, vcs) {
  const url = `${api}/project/${vcs}/${repo}/envvar`;
  return fetchWithToken(url, token, "circleci");
}

export function resolveVcsSlug(vcs) {
  if (vcs === "GitHub") return "gh";
  else if (vcs === "Bitbucket") return "bb";
  else if (vcs === "GitLab") return "gl";
  else exitWithError("Invalid VCS: ", vcs);
}

async function fetchWithToken(url, token, platform) {
  const headers = (platform === "github") ? { Authorization: `Bearer ${token}` } : { "Circle-Token": `${token}` };
  const response = await fetch(url, { headers });
  const responseBody = await response.json();
  return { response, responseBody };
}
