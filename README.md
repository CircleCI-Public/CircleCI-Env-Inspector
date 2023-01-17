# CircleCI-Env-Inspector

An interactive CLI tool for fetching all of your secrets from CircleCI.

## Pre-requisites

- Docker

## To Run

1. Clone this repo
2. Obtain a CircleCI API token from https://app.circleci.com/settings/user/tokens
    - Note: This token must have access to the projects you want to inspect, consider using an org admin account's token
3. Run `run.sh` from the root of the repo
4. Follow the prompts.



https://user-images.githubusercontent.com/33272306/211970169-407a9455-ba34-4de1-a0d0-5a9dd7a8674c.mp4



## Example Output

```json
{
  "contexts": [
    {
      "name": "CONTEXT_NAME",
      "url": "https://app.circleci.com/settings/organization/<VCS>/<ORG>/contexts/<CONTEXT-ID>",
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
      "url": "https://app.circleci.com/settings/project/<VCS>/<ORG>/<REPO>/environment-variables",
      "variables": [{ "name": "VAR", "value": "xxxx" }],
      "project_keys": [
        {
          "type": "deploy-key",
          "preferred": true,
          "created_at": "xxx",
          "public_key": "yyy",
          "fingerprint": "zzz"
        }
          ]
    }
  ]

}
```

# F.A.Q.

## Q: Will this tool return the values of my secrets?

A: **No.** This tool will only return the names of the secrets and as much information as can be provided by the CircleCI APIs. CircleCI _does not_ return the values of secrets through their APIs. The information from this tool is for auditing and key rotation purposes.
