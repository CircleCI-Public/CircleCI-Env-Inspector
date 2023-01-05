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