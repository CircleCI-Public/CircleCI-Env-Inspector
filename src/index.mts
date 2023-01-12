import chalk from "chalk";
import { writeFileSync } from "fs";
import inquirer from "inquirer";

import {
  CircleCIAccountData,
  CircleCIContext,
  CircleCIContextVariable,
  CircleCIEnvInspectorReport,
  CircleCIProjectVariable,
  CircleCIResponseRepo,
  getCircleCIRepos,
  getCollaborations,
  getContexts,
  getContextVariables,
  getProjectVariables,
} from "./utils/circleci.mjs";
import { exitWithError, getPaginatedData } from "./utils/utils.mjs";

const USER_DATA: CircleCIEnvInspectorReport[] = [];

// Enter CircleCI Token if none is set
const CIRCLE_TOKEN =
  process.env.CIRCLE_TOKEN ??
  (
    await inquirer.prompt([
      {
        message: "Enter your CircleCI API token",
        type: "password",
        name: "cciToken",
      },
    ])
  ).cciToken;

// Get Collaborations
const { responseBody: accounts, response: accountsRes } =
  await getCollaborations(CIRCLE_TOKEN);
if (!accountsRes.ok)
  exitWithError("Couldn't fetch accounts. Please open an issue.", accountsRes);

console.log(chalk.bold(`Found ${accounts.length} accounts.`));

const demoAccounts = accounts.filter(
  (acc) =>
    acc.name === "KyleTryon" ||
    acc.name === "game-ci" ||
    acc.name === "TechSquidTV" ||
    acc.name === "KyleTCCI"
);

// Fetching data for each account
for (let index = 0; index < demoAccounts.length; index++) {
  const account = demoAccounts[index];
  const accountData: CircleCIAccountData = {
    contexts: [],
    projects: [],
    unavailable: [],
  };
  const FetchingDataMessage = () => {
    const vcs = () => {
      switch (account.vcs_type.toLowerCase()) {
        case "github" || "gh":
          return chalk.bold.green("GitHub");
        case "bitbucket" || "bb":
          return chalk.bold.blue("Bitbucket");
        case "circleci":
          return `${chalk.bold.white("CircleCI")}/${chalk.bold.yellow(
            "GitLab"
          )}`;
        default:
          exitWithError("Invalid VCS: ", account);
      }
    };
    return `Fetching data for ${chalk.bold.magenta(
      account.name
    )} from ${vcs()}...  ${chalk.italic(index + 1 + "/" + accounts.length)}`;
  };
  console.log(FetchingDataMessage());
  console.log("  " + chalk.italic("Fetching Contexts..."));

  // Fetching Org Context information
  const contextList = await getPaginatedData<CircleCIContext>(
    CIRCLE_TOKEN,
    account.id,
    getContexts
  );

  const contextData = contextList.map(async (context) => {
    return {
      name: context.name,
      id: context.id,
      url: `https://app.circleci.com/settings/organization/${account.slug}/contexts/${context.id}`,
      variables: await getPaginatedData<CircleCIContextVariable>(
        CIRCLE_TOKEN,
        context.id,
        getContextVariables
      ),
    };
  });

  accountData.contexts = await Promise.all(contextData);

  // Fetching Org Project information
  console.log("  " + chalk.italic("Fetching Projects..."));
  const RepoList = await getPaginatedData<CircleCIResponseRepo>(
    CIRCLE_TOKEN,
    account.id,
    getCircleCIRepos
  );

  console.log("  " + chalk.italic("Fetching Project Variables..."));
  const RepoData = RepoList.map(async (repo) => {
    return {
      name: repo.name,
      url: `https://app.circleci.com/settings/project/${repo.slug}/environment-variables`,
      variables: await getPaginatedData<CircleCIProjectVariable>(
        CIRCLE_TOKEN,
        repo.id,
        getProjectVariables
      ),
    };
  });

  accountData.projects = await Promise.all(RepoData);

  USER_DATA.push({ [account.name]: accountData });
}

writeFileSync("circleci-data.json", JSON.stringify(USER_DATA, null, 2));

console.log(
  `\n ${chalk.bold.green("Done!")} \n Data saved to circleci-data.json`
);
