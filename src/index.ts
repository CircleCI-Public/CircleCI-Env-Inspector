import chalk from "chalk";
import inquirer from "inquirer";

import {
  CircleCI,
  CircleCICollaboration,
  CircleCIEnvInspectorReport,
  CircleCIUser,
} from "./utils/CircleCI";
import { exitOnError } from "./utils/Utils";

type UserInput = {
  user: CircleCIUser;
  accounts: CircleCICollaboration[];
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
      if (!user.name) {
        exitOnError(new Error("No user name returned"));
      }
      console.log(
        chalk.bold.green("Successfully authenticated as: "),
        chalk.bold(user.name)
      );
      return user;
    })
    .catch((e) => {
      exitOnError(e, "Failed to authenticate");
    })) as CircleCIUser;

  // Get all collaborations
  const collaborations: CircleCICollaboration[] = (await client
    .getCollaborations()
    .catch((e) => {
      exitOnError(e, "Failed to fetch collaborations");
    })) as CircleCICollaboration[];
  console.log(
    chalk.bold.green(
      "Found collaborations: ",
      chalk.bold(collaborations.length)
    )
  );

  // Select from collaborations
  const selectedCollbs = (
    await inquirer.prompt([
      {
        type: "checkbox",
        name: "collaborations",
        message: "Select accounts: \n",
        choices: collaborations.map((collab) => {
          return {
            name: ` ${collab.slug}`,
            value: collab,
          };
        }),
      },
    ])
  ).collaborations as CircleCICollaboration[];
  if (!selectedCollbs.length) {
    exitOnError(new Error("No collaborations selected"));
  }

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
  const { client, user } = userInput;
  for (const account of userInput.accounts) {
    const repos = await client.getRepos(account.id);
  }
};

getUserInput().then(generateReport);
