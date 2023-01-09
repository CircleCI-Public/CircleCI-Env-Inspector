import fetch from "node-fetch";
import {
  CircleCIContext,
  CircleCIProject,
  CircleCIPaginatedAPIResponse,
} from "./circleci";

export type CircleCIEnvInspectorReport = {
  [name: string]: {
    contexts: CircleCIContext[];
    projects: CircleCIProject[];
    unavailable: any[];
  };
};

export function exitWithError(message: string, ...optionalParams: any[]) {
  console.error(message, optionalParams);
  process.exit(1);
}

export function debug(message: string, ...optionalParams: any[]) {
  console.log(message, optionalParams);
}

export function resolveVcsSlug(vcs: string) {
  if (vcs === "GitHub") return "gh";
  else if (vcs === "Bitbucket") return "bb";
  else exitWithError("Invalid VCS: ", vcs);
}

export async function fetchWithToken<T>(
  url: string,
  token: string,
  platform: string,
  wait = 0
) {
  const headers: HeadersInit =
    platform === "github"
      ? { Authorization: `Bearer ${token}` }
      : { "Circle-Token": `${token}` };
  if (wait > 0)
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  const response = await fetch(url, { headers });
  let responseBody;

  try {
    responseBody = await response.json();
  } catch (SyntaxError) {
    responseBody = { message: response.body };
  }
  return { response, responseBody: responseBody as T };
}

const getPaginatedData = async <T>(
  token: string,
  identifier: string,
  caller: (
    token: string,
    identifier: string,
    pageToken: string
  ) => Promise<{
    response: Response;
    responseBody: CircleCIPaginatedAPIResponse<T>;
  }>
) => {
  const items = [];
  let pageToken = "";

  do {
    const { response, responseBody } = await caller(
      token,
      identifier,
      pageToken
    );
    if (response.status !== 200)
      exitWithError(
        "Failed to get data with the following error:\n",
        responseBody
      );
    if (responseBody.items.length > 0) items.push(...responseBody.items);
    pageToken = responseBody.next_page_token;
  } while (pageToken);

  return items;
};
