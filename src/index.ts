import chalk from "chalk";
import inquirer from "inquirer";

import {
  CircleCI,
  CircleCICollaboration,
  CircleCIUser,
} from "./utils/CircleCI";
import { exitOnError } from "./utils/Utils";

const main = async () => {
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

  const CCI = new CircleCI(CIRCLE_TOKEN);

  // Authenticate
  const user = (await CCI.getAuthenticatedUser()
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
  const collaborations: CircleCICollaboration[] =
    (await CCI.getCollaborations().catch((e) => {
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

  // Loop through selected collaborations
  for (const collab of selectedCollbs) {
    const repos = await CCI.getRepos(collab.id);
  }
};
main();
