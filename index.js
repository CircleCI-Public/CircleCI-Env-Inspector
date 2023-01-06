import inquirer from "inquirer";
import { exitWithError, getCollaborations, getContexts, getContextVariables, getRepos, getProjectVariables, resolveVcsSlug } from "./utils.js";

const CIRCLE_V1_API = "https://circleci.com/api/v1.1";
const CIRCLE_V2_API = "https://circleci.com/api/v2";
const GITHUB_API = "https://api.github.com";

const USER_DATA = {
  contexts: [],
  projects: [],
};

// Enter CircleCI Token if none is set
const CIRCLE_TOKEN = process.env.CIRCLE_TOKEN || (await inquirer.prompt([
  {
    message: "Enter your CircleCI API token",
    type: "password",
    name: "cciToken",
  },
])).cciToken;

// Select VCS
const VCS = (await inquirer.prompt([
  {
    message: "Select a VCS",
    type: "list",
    name: "vcs",
    choices: [ "GitHub", "Bitbucket", "GitLab" ],
  }
])).vcs;

// Enter GitHub Token if none is set
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || (await inquirer.prompt([
  {
    message: "Enter your GitHub API token",
    type: "password",
    name: "ghToken",
    when: VCS === "GitHub",
  },
])).ghToken;

const { response: resCollaborations, responseBody: collaboratorList } = await getCollaborations(CIRCLE_V2_API, CIRCLE_TOKEN);
if (resCollaborations.status !== 200) exitWithError('Failed to get collaborations with the following error:\n', resultsJSON);

const answers = await inquirer.prompt([
  {
    message: "Select an account",
    type: "list",
    name: "account",
    choices: collaboratorList.map((collaboration) => collaboration.name),
  },
  {
    message: "Is this an Organization (Not a User)?",
    type: "confirm",
    name: "isOrg",
    when: VCS === "GitHub",
  },
]);

const accountID = collaboratorList.find(
  (collaboration) => collaboration.name === answers.account
).id;

const getPaginatedData = async (api, token, identifier, caller) => {
  const items = [];
  let pageToken = "";

  do {
    const { response, responseBody } = await caller(api, token, identifier, pageToken);
    if (response.status !== 200) exitWithError('Failed to get data with the following error:\n', responseBody);
    if (responseBody.items.length > 0) items.push(...responseBody.items);
    pageToken = responseBody.next_page_token;
  } while (pageToken);

  return items;
}

const contextList = await getPaginatedData(CIRCLE_V2_API, CIRCLE_TOKEN, accountID, getContexts);
const contextData = await Promise.all(
  contextList.map(async (context) => {
    const variables = await getPaginatedData(CIRCLE_V2_API, CIRCLE_TOKEN, context.id, getContextVariables);
    return {
      name: context.name,
      id: context.id,
      variables,
    };
  })
);
USER_DATA.contexts = contextData;

const getRepoList = async (api, token, accountID) => {
  const items = [];
  const slug = answers.isOrg ? "orgs" : "users";
  const source = api.includes("github") ? "github" : "circleci";
  let pageToken = 1;
  let keepGoing = true;

  do {
    const { response, responseBody } = await getRepos(api, token, slug, accountID, pageToken);
    if (response.status !== 200) exitWithError('Failed to get data with the following error:\n', responseBody);

    const reducer = source === "github"
      ? (acc, curr) => [...acc, curr.full_name]
      : (acc, curr) => [...acc, `${curr.username}/${curr.reponame}`];

    if (responseBody.length > 0) items.push(...responseBody.reduce(reducer, []));
    // CircleCI only requires one request to get all repos.
    if (responseBody.length === 0 || source === "circleci") keepGoing = false;
    pageToken++;
  } while (keepGoing);

  return items;
}
const repoList = (VCS === "GitHub")
  ? await getRepoList(GITHUB_API, GITHUB_TOKEN, answers.account)
  : await getRepoList(CIRCLE_V1_API, CIRCLE_TOKEN, answers.account);

const repoData = await Promise.all(
  repoList.map(async (repo) => {
    const vcsSlug = resolveVcsSlug(VCS);
    const { response, responseBody } = await getProjectVariables(CIRCLE_V2_API, CIRCLE_TOKEN, repo, vcsSlug);
    if (response.status !== 200) exitWithError('Failed to get data with the following error:\n', responseBody);
    return { name: repo, variables: responseBody.items };
  })
);
USER_DATA.projects = repoData.filter((repo) => repo.variables.length > 0);

console.dir(USER_DATA, { depth: null });
