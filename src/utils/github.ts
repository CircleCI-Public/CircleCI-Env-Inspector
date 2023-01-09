import { fetchWithToken } from "./utils";

export type GitHubResponseRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  html_url: string;
};

const GITHUB_API = process.env.GITHUB_API ?? "https://api.github.com";

export const getGitHubRepos = async (
  secretToken: string,
  slug: string,
  pageToken: string
) => {
  return fetchWithToken<GitHubResponseRepo[]>(
    `${GITHUB_API}/${slug}/repos?per_page=100&page=${pageToken}`,
    secretToken,
    "github"
  );
};
