import chalk from "chalk";
import http from "http";
import https from "https";
import fetch from "node-fetch";
import { Response } from "node-fetch";

import { CircleCIPaginatedAPIResponse } from "./circleci";

// Inspired by https://stackoverflow.com/a/62500224
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const agent = (_parsedURL: URL) =>
  _parsedURL.protocol == "http:" ? httpAgent : httpsAgent;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exitWithError(message: string, ...optionalParams: any[]) {
  console.error(chalk.bold.red(`Error: ${message}`), optionalParams);
  process.exit(1);
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
  const response = await fetch(url, { headers, agent });
  let responseBody;

  try {
    responseBody = await response.json();
  } catch (SyntaxError) {
    responseBody = { message: response.body };
  }
  return { response, responseBody: responseBody as T };
}

export async function getPaginatedData<T>(
  token: string,
  identifier: string,
  caller: (
    token: string,
    [identifier]: string,
    pageToken: string
  ) => Promise<{
    response: Response;
    responseBody: CircleCIPaginatedAPIResponse<T>;
  }>,
  equalityCheck?: (a: T, b: T) => boolean
) {
  const items: T[] = [];

  let pageToken = "";

  do {
    const { response, responseBody } = await caller(
      token,
      identifier,
      pageToken
    );
    if (response.ok && responseBody.items.length > 0) {
      if (equalityCheck) {
        // duplicated expected e.g. from the private api
        const intersection = [];
        responseBody.items.forEach((item) => {
          if (items.find((obj) => equalityCheck(obj, item)))
            intersection.push(item);
          else items.push(item);
        });
        if (intersection.length > 0)
          // from now on the private api will fetch the same projects over and over again
          break;
      } else {
        items.push(...responseBody.items);
      }
    }
    pageToken = responseBody.next_page_token;
  } while (pageToken);

  return items;
}

export type VCS_TYPE = "github" | "bitbucket" | "circleci";
