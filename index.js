import inquirer from "inquirer";
import fetch from "node-fetch";
let CIRCLE_TOKEN = process.env.CIRCLE_TOKEN || null;
let GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

const USER_DATA = {
  contexts: [],
  projects: [],
};

// Enter CircleCI Token if none is set
if (!CIRCLE_TOKEN) {
  const CIRCLE_TOKEN_ANSWER = await inquirer.prompt([
    {
      message: "Enter your CircleCI API token",
      type: "password",
      name: "cci-token",
    },
  ]);
  CIRCLE_TOKEN = CIRCLE_TOKEN_ANSWER["cci-token"];
}

// Enter GitHub Token if none is set
if (!GITHUB_TOKEN) {
  const GITHUB_TOKEN_ANSWER = await inquirer.prompt([
    {
      message: "Enter your GitHub API token",
      type: "password",
      name: "gh-token",
    },
  ]);
  GITHUB_TOKEN = GITHUB_TOKEN_ANSWER["gh-token"];
}

const getCollaborations = async () => {
  let url = "https://circleci.com/api/v2/me/collaborations";
  let results = await fetch(url, {
    headers: { "Circle-Token": `${CIRCLE_TOKEN}` },
  }).then((res) => res.json());
  return results;
};

const collaboratorList = await getCollaborations();

const answers = await inquirer.prompt([
  {
    message: "Select an account",
    type: "list",
    name: "account",
    choices: await collaboratorList.map((collaboration) => collaboration.name),
  },
  {
    message: "Is this an Organization (Not a User)?",
    type: "confirm",
    name: "isOrg",
  },
]);

const accountID = collaboratorList.find(
  (collaboration) => collaboration.name === answers.account
).id;

const getContextList = async (ownerID, pageToken, contextItems) => {
  let url = `https://circleci.com/api/v2/context?owner-id=${ownerID}`;
  if (pageToken) {
    url = `${url}&page-token=${pageToken}`;
  }
  let items = contextItems || [];
  let results = await fetch(url, {
    headers: { "Circle-Token": `${CIRCLE_TOKEN}` },
  }).then((res) => res.json());
  items.push(...results.items);
  if (results.next_page_token) {
    getContextList(ownerID, results.next_page_token, items);
  }
  return items;
};

const getContextVariables = async (contextID, pageToken, variableItems) => {
  let url = `https://circleci.com/api/v2/context/${contextID}/environment-variable`;
  if (pageToken) {
    url = `${url}?page-token=${pageToken}`;
  }
  let items = variableItems || [];
  let results = await fetch(url, {
    headers: { "Circle-Token": `${CIRCLE_TOKEN}` },
  }).then((res) => res.json());
  items.push(...results.items);
  if (results.next_page_token) {
    getContextVariables(contextID, results.next_page_token, items);
  }
  return items;
};

const contextList = await getContextList(accountID);

const contexData = await Promise.all(
  contextList.map(async (context) => {
    const variables = await getContextVariables(context.id);
    return {
      name: context.name,
      id: context.id,
      variables,
    };
  })
);
USER_DATA.contexts = contexData;

// Fetch Projects Data

const getGitHubRepos = async (pageNumber, data) => {
  data = data || [];
  const page = pageNumber || 1;
  const slug = answers.isOrg ? "orgs" : "users";
  const url = `https://api.github.com/${slug}/${answers.account}/repos?per_page=100&page=${page}`;
  const results = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  }).then(async (res) => {
    if (res.status === 200) {
      return res.json();
    } else if (res.status === 403) {
      console.log("Auth Error");
    }
    console.dir(await res.json());
    process.exit(1);
  });
  if (results)
    if (results.length === 0) {
      return data.map((repo) => repo.full_name);
    }
  return getGitHubRepos(page + 1, [...results, ...data]);
};

const repoList = await getGitHubRepos();

const repoData = await Promise.all(
  repoList.map(async (repo) => {
    const url = `https://circleci.com/api/v2/project/gh/${repo}/envvar`;
    const results = await fetch(url, {
      headers: { "Circle-Token": `${CIRCLE_TOKEN}` },
    }).then((res) => res.json());

    return {
      name: repo,
      variables: results.items,
    };
  })
);
USER_DATA.projects = repoData.filter((repo) => repo.variables.length > 0);

console.dir(USER_DATA, { depth: null });
