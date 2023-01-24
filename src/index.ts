import chalk from "chalk";
import { writeFileSync } from "fs";
import inquirer from "inquirer";

import {
  CircleCIAccountData,
  CircleCIContext,
  CircleCIContextVariable,
  CircleCIEnvInspectorReport,
  CircleCIProjectKey,
  CircleCIProjectVariable,
  CircleCIResponseRepo,
  getCircleCIRepos,
  getCollaborations,
  getContexts,
  getContextVariables,
  getProjectVariables,
  getSSHKeys,
} from "./utils/circleci";
import { exitWithError, getPaginatedData } from "./utils/utils";

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
if (!accountsRes.ok) {
  if (accountsRes.status === 401) {
    exitWithError(
      "Invalid CircleCI Token. Please check your token and try again. Ensure you are using a Personal API Token and not a Project API Token.",
      {
        status: accountsRes.status,
        statusText: accountsRes.statusText,
      }
    );
  } else {
    exitWithError(
      "Couldn't fetch accounts. Please open an issue.",
      accountsRes
    );
  }
}

console.log(chalk.bold(`Found ${accounts.length} accounts.`));

// Fetching data for each account
for (let index = 0; index < accounts.length; index++) {
  const account = accounts[index];
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

  for (const context of contextList) {
    let vars;
    try {
      vars = await getPaginatedData<CircleCIContextVariable>(
        CIRCLE_TOKEN,
        context.id,
        getContextVariables
      );
    } catch (error) {
      vars = [
        {
          variable: "ERROR: Unable to fetch variables. ",
          context_id: "error",
          created_at: "error",
          error: `${error}`,
        },
      ];
    }
    accountData.contexts.push({
      name: context.name,
      id: context.id,
      url: `https://app.circleci.com/settings/organization/${account.slug}/contexts/${context.id}`,
      variables: vars,
    });
  }

  // Fetching Org Project information
  console.log("  " + chalk.italic("Fetching Projects..."));
  // /api/private has a bug where it could return duplicate projects over multiple pages
  const isSameProject = (prj1: any, prj2: any): boolean => {
    return prj1.id === prj2.id;
  };
  const RepoList = await getPaginatedData<CircleCIResponseRepo>(
    CIRCLE_TOKEN,
    account.id,
    getCircleCIRepos,
    isSameProject
  );

  console.log("  " + chalk.italic("Fetching Project Variables..."));
  for (const repo of RepoList) {
    let vars: CircleCIProjectVariable[];
    try {
      vars = await getPaginatedData<CircleCIProjectVariable>(
        CIRCLE_TOKEN,
        repo.slug,
        getProjectVariables
      );
    } catch (error) {
      vars = [
        {
          name: "ERROR: Unable to fetch variables. ",
          value: "error",
          error: `${error}`,
        },
      ];
    }
    let projectKeys: CircleCIProjectKey[];
    try {
      projectKeys = await getPaginatedData<CircleCIProjectKey>(
        CIRCLE_TOKEN,
        repo.slug,
        getSSHKeys
      );
    } catch (error) {
      projectKeys = [
        {
          type: "ERROR: Unable to fetch keys. ",
          created_at: "error",
          preferred: "error",
          fingerprint: "error",
          public_key: "error",
          error: `${error}`,
        },
      ];
    }

    accountData.projects.push({
      name: repo.name,
      url: `https://app.circleci.com/settings/project/${repo.slug}/environment-variables`,
      variables: vars,
      project_keys: projectKeys,
    });
  }

  USER_DATA.push({ [account.name]: accountData });
}

writeFileSync("circleci-data.json", JSON.stringify(USER_DATA, null, 2));

console.log(
  `\n ${chalk.bold.green("Done!")} \n Data saved to circleci-data.json`
);
