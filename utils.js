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

export async function getRepos(api, token, slug, pageToken) {

  const url = api.includes("github")
    ? `${api}/${slug}/repos?per_page=100&page=${pageToken}`
    : `${api}/projects`;
  return api.includes("github") ? fetchWithToken(url, token, "github") : fetchWithToken(url, token, "circleci");
}

export async function getProjectVariables(api, token, repo, vcs, wait = 0) {
  const url = `${api}/project/${vcs}/${repo}/envvar`;
  return fetchWithToken(url, token, "circleci", wait);
}

export function resolveVcsSlug(vcs) {
  if (vcs === "GitHub") return "gh";
  else if (vcs === "Bitbucket") return "bb";
  else if (vcs === "GitLab") return "gl";
  else exitWithError("Invalid VCS: ", vcs);
}

async function fetchWithToken(url, token, platform, wait = 0) {
  const headers =
    platform === "github"
      ? { Authorization: `Bearer ${token}` }
      : { "Circle-Token": `${token}` };
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  const response = await fetch(url, { headers });
  let responseBody;

  try { responseBody = await response.json(); } 
  catch (SyntaxError) { responseBody = { message: response.body }; }
  return { response, responseBody };
}
