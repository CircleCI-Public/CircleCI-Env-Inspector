import inquirer from "inquirer";
import fetch from "node-fetch";
let CIRCLE_TOKEN = process.env.CIRCLE_TOKEN || null;
const USER_DATA = {
  contexts: [],
  projects: [],
};

// Enter CircleCI Token if none is set
if (!CIRCLE_TOKEN) {
  CIRCLE_TOKEN = await inquirer.prompt([
    {
      message: "Enter your CircleCI API token",
      type: "password",
      name: "token",
    },
  ]);
}

const getCollaborations = async (pageToken) => {
  let url = "https://circleci.com/api/v2/me/collaborations";
  if (pageToken) {
    url = `${url}?page-token=${pageToken}`;
  }
  let results = await fetch(url, {
    headers: { "Circle-Token": `${CIRCLE_TOKEN}` },
  }).then((res) => res.json());
  if (results.next_page_token) {
    results = results.concat(await getCollaborations(results.next_page_token));
  }
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
      variables,
    };
  })
);
