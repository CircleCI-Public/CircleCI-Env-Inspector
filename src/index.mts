import inquirer from "inquirer";
import { exitWithError, getPaginatedData } from "./utils/utils.mjs";
import {
  CircleCIAccountData,
  CircleCIContext,
  CircleCIContextVariable,
  CircleCIEnvInspectorReport,
  CircleCIResponseRepo,
  getCircleCIRepos,
  getCollaborations,
  getContexts,
  getContextVariables,
} from "./utils/circleci.mjs";
import chalk from "chalk";

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
      variables: await getPaginatedData<CircleCIContextVariable>(
        CIRCLE_TOKEN,
        context.id,
        getContextVariables
      ),
    };
  });

  accountData.contexts = await Promise.all(contextData);

  // Fetching Org Project information

  const RepoList = await getPaginatedData<CircleCIResponseRepo>(
    CIRCLE_TOKEN,
    account.id,
    getCircleCIRepos
  );
  accountData.projects = RepoList.map((repo) => {
    return {
      name: repo.name,
      variables: [],
    };
  });

  USER_DATA.push({ [account.name]: accountData });
}

// const getRepoList = async (
//   api: string,
//   token: string,
//   accountName: string
// ): Promise<string[]> => {
//   const items: string[] = [];
//   const slug = answers.isOrg ? `orgs/${accountName}` : "user";
//   const source = VCS === "GitHub" ? "github" : "circleci";
//   let pageToken = "1";
//   let keepGoing = true;

//   do {
//     try {
//       const { response, responseBody } = await getRepos(
//         api,
//         token,
//         slug,
//         pageToken
//       );
//       if (response.status !== 200)
//         exitWithError(
//           "Failed to get repositories with the following error:\n",
//           responseBody
//         );
//       const reducer =
//         VCS === "GitHub"
//           ? (acc: string[], curr: GitHubResponseRepo): string[] => [
//               ...acc,
//               curr.full_name,
//             ]
//           : (acc: string[], curr: CircleCIResponseRepo): string[] => [
//               ...acc,
//               `${curr.username}/${curr.reponame}`,
//             ];

//       if (responseBody?.length > 0)
//         items.push(...responseBody.reduce(reducer, []));
//       // CircleCI only requires one request to get all repos.
//       if (responseBody.length === 0 || source === "circleci") keepGoing = false;
//       pageToken++;
//     } catch (error) {
//       console.log(error);
//     }
//   } while (keepGoing);

//   return items;
// };

// console.log("Getting Projects Variables...");

// const repoData = await Promise.all(
//   repoList.map(async (repo) => {
//     const vcsSlug = resolveVcsSlug(VCS);
//     let resProjectVars = await getProjectVariables(
//       CIRCLE_V2_API,
//       CIRCLE_TOKEN,
//       repo,
//       vcsSlug
//     );
//     if (resProjectVars.response.status === 429) {
//       let waitTime = 1;
//       let multiplier = 2;
//       let count = 0;
//       let maxWait = 300;
//       let maxRetries = 30;
//       do {
//         const retryAfterHeader =
//           resProjectVars.response.headers.get("retry-after");
//         const retryAfter =
//           !retryAfterHeader && retryAfterHeader > 0
//             ? retryAfterHeader
//             : waitTime;
//         console.dir(`Waiting ${retryAfter} seconds. Retry #${count}`);
//         resProjectVars = await getProjectVariables(
//           CIRCLE_V2_API,
//           CIRCLE_TOKEN,
//           repo,
//           vcsSlug,
//           retryAfter
//         );
//         if (waitTime < maxWait) waitTime *= multiplier;
//       } while (resProjectVars.response.status === 429 && count++ < maxRetries);
//     } else if (resProjectVars.response.status != 200)
//       USER_DATA.unavailable.push(repo);
//     return { name: repo, variables: resProjectVars?.responseBody?.items };
//   })
// );

// USER_DATA.projects = repoData.filter((repo) => repo?.variables?.length > 0);

// fs.writeFileSync("circleci-data.json", JSON.stringify(USER_DATA, null, 2));
// console.log("Log created at circleci-data.json");
console.dir(USER_DATA, { depth: null });
