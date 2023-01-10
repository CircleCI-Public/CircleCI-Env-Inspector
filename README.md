# CircleCI-Env-Inspector
An interactive CLI tool for fetching all of your secrets from CircleCI.

## Pre-requisites
 - Docker

## To Run

1. Clone this repo
2. Run `run.sh` from the root of the repo
3. Follow the prompts.

## Example Output

```json
{
  "contexts": [
    {
      "name": "CONTEXT_NAME",
      "id": "xxx",
      "variables": [
        {
          "variable": "GITHUB_TOKEN",
          "context_id": "xxx",
          "created_at": "yyy"
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "ORG/REPO",
      "variables": [
        { "name": "VAR", "value": "xxxx" }
      ]
    }
  ]
}
```

# F.A.Q.

## Q: Why is a GitHub token needed?

A: When accessing the list of repositories a user has access to making the call through CircleCI's API can sometimes result in a GitHub API rate limit error. To avoid this, the tool uses a GitHub token to make the call directly to the GitHub API more efficiently. You will not be asked for this token if you do not have access to any GitHub based VCS accounts.


## Q: Will this tool return the values of my secrets?

A: **No.** This tool will only return the names of the secrets. This tool is to aid in auditing and rotating secrets.