import inquirer from "inquirer";
import { CircleCIEnvInspectorReport } from "./utils";
import * as fs from "fs";
import { getCollaborations } from "./circleci";

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

// let GITHUB_TOKEN = "";

// Get Collaborations
const accounts = await getCollaborations(CIRCLE_TOKEN);
// Checks to see if this is a github account; if so, checks/asks for a github token
const isGitHub = accounts.responseBody.find(
  (account) => account.vcs_type.toLowerCase() === "github"
);
const GITHUB_TOKEN: string = isGitHub
  ? process.env.GITHUB_TOKEN ??
    (
      await inquirer.prompt([
        {
          message: "Enter your GitHub API token",
          type: "password",
          name: "ghToken",
        },
      ])
    ).ghToken
  : "";

// Loop through each account



// console.log("Getting Contexts Data...");

// if (accountID) {
//   const contextList = await getPaginatedData<CircleCIContext>(
//     CIRCLE_TOKEN,
//     accountID,
//     getContexts
//   );

//   const contextData = await Promise.all(
//     contextList.map(async (context) => {
//       const variables = await getPaginatedData<CircleCIPaginatedAPIResponse<CircleCIContextVariable>>(
//         CIRCLE_TOKEN,
//         context.id,
//         getContextVariables
//       );
//       return {
//         name: context.name,
//         id: context.id,
//         variables,
//       };
//     })
//   );
//   USER_DATA.contexts = contextData;
// } else {
//   USER_DATA.contexts = [];
// }

// console.log("Getting Projects Data...");

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

// const repoList =
//   VCS === "GitHub"
//     ? await getRepoList(GITHUB_API, GITHUB_TOKEN, answers.account)
//     : await getRepoList(CIRCLE_V1_API, CIRCLE_TOKEN, answers.account);

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

fs.writeFileSync("circleci-data.json", JSON.stringify(USER_DATA, null, 2));
console.log("Log created at circleci-data.json");
