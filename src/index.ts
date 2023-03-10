import { writeFileSync } from "fs";
import inquirer from "inquirer";

import {
  CircleCI,
  CircleCIAccountReport,
  CircleCIAPICollaboration,
  CircleCIAPIUser,
  CircleCIEnvInspectorReport,
} from "./utils/CircleCI";
import { exitWithError, printMessage } from "./utils/Utils";

type UserInput = {
  user: CircleCIAPIUser;
  accounts: CircleCIAPICollaboration[];
  token: string;
  client: CircleCI;
};

const getUserInput = async (): Promise<UserInput> => {
  const CIRCLE_TOKEN =
    process.env.CIRCLE_TOKEN ??
    ((
      await inquirer.prompt([
        {
          message: "Enter your CircleCI API token",
          type: "password",
          name: "CIRCLE_TOKEN",
        },
      ])
    ).CIRCLE_TOKEN as string);

  const client = new CircleCI(CIRCLE_TOKEN);

  // Authenticate
  const user = (await client
    .getAuthenticatedUser()
    .then((user) => {
      if (!user.name && !user.login) {
        exitWithError(new Error(JSON.stringify(user)), "No username returned");
      }
      printMessage(user.name ?? user.login, "Successfully authenticated as:");
      return user;
    })
    .catch((e) => {
      exitWithError(e, "Fatally failed to authenticate:");
    })) as CircleCIAPIUser;

  // Get all collaborations
  const collaborations: CircleCIAPICollaboration[] = (await client
    .getCollaborations()
    .then((collaborations) =>
      collaborations.filter((collaboration) => collaboration.id)
    )
    .catch((e) => {
      exitWithError(e, "Failed to fetch collaborations");
    })) as CircleCIAPICollaboration[];
  printMessage(`${collaborations.length}`, "Accounts found:");

  // Select from collaborations
  const selectedCollbs = (
    await inquirer.prompt([
      {
        type: "checkbox",
        name: "collaborations",
        message: "Select accounts: \n",
        choices: collaborations.map((collab) => {
          return {
            name:
              collab.vcs_type == "circleci"
                ? ` gl/${collab.name}`
                : ` ${collab.slug}`,
            value: collab,
          };
        }),
      },
    ])
  ).collaborations as CircleCIAPICollaboration[];
  if (!selectedCollbs || selectedCollbs.length === 0) {
    exitWithError(new Error("No collaborations selected"));
  }
  printMessage(`${selectedCollbs.length}`, "Accounts selected:");

  return {
    user: user,
    accounts: selectedCollbs,
    token: CIRCLE_TOKEN,
    client: client,
  };
};

const generateReport = async (
  userInput: UserInput
): Promise<CircleCIEnvInspectorReport> => {
  const { client, user, accounts } = userInput;
  const report: CircleCIEnvInspectorReport = {
    user: user,
    accounts: [],
  };
  for (const account of accounts) {
    const accountReport: CircleCIAccountReport = {
      name: account.name,
      id: account.id,
      vcstype: account.vcs_type,
      contexts: [],
      projects: [],
      errors: [],
    };
    const contextData = await client.getContexts(account.id, account.slug);
    accountReport.contexts = contextData.contextsReport;
    if (contextData.errors.length > 0) {
      accountReport.errors.push(...contextData.errors);
    }
    accountReport.projects = await client.getProjects(account.id);

    report.accounts.push(accountReport);
  }
  return report;
};

// Execute program
getUserInput().then(async (userInput) => {
  const report = await generateReport(userInput);
  writeFileSync("circleci-data.json", JSON.stringify(report, null, 2));
  printMessage("./circleci-data.json", "Report saved to:");
});
