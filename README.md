# CircleCI-Env-Inspector

An interactive CLI tool for fetching all of your secrets from CircleCI.

https://user-images.githubusercontent.com/33272306/211970169-407a9455-ba34-4de1-a0d0-5a9dd7a8674c.mp4

## How to Run

You will need to first obtain a CircleCI Personal Access token from https://app.circleci.com/settings/user/tokens

- Note: This token must have access to the projects you want to inspect, consider using an org admin account's token

### To Run With DockerHub Image

[![Docker Image Version (latest by date)](https://img.shields.io/docker/v/circlecipublic/cci-env-inspector?logo=docker)](https://hub.docker.com/r/circlecipublic/cci-env-inspector/tags)

1. Run the container.
   - `docker run --name circleci-env-inspector -it circlecipublic/cci-env-inspector`
2. Follow the prompts and select which accounts you want to inspect.
3. Copy the generated report from the container.
   - `docker cp circleci-env-inspector:/project/circleci-data.json circleci-data.json`

### To Run With Node

It is recommended to use Node version 18.10.

1. Clone this repo
2. Run `npm install`
3. Run `npm start`
4. Follow the prompts and select which accounts you want to inspect.

### To Build and Run Locally (Podman / Docker)

1. Clone this repo
2. Run `run.sh` from the root of the repo
3. Follow the prompts and select which accounts you want to inspect.

## Example Output

<details>
  <summary>Click to expand</summary>
  
```js
{
  user: {
    name: 'The authenticated user',
    login: 'my-user',
    id: 'xxxxxxxx-yyyy-xxxx-yyyy-xxxxxxxxxxxx',
  },
  accounts: [
    {
      name: 'Account Name',
      id: 'xxxxxxxx-yyyy-xxxx-yyyy-xxxxxxxxxxxx',
      vcstype: 'github',
      contexts: [
        {
          name: 'my-context',
          id: 'xxxxxxxx-yyyy-xxxx-yyyy-xxxxxxxxxxxx',
          created_at: '2023-01-30T03:13:05.765Z',
          url: 'https://circleci.com/<slug>/contexts/my-context-id',
          variables:  [
            {
              variable: 'MY_SECRET',
              updated_at: '2023-01-30T03:13:05.765Z',
              context_id: 'xxxxxxxx-yyyy-xxxx-yyyy-xxxxxxxxxxxx',
              created_at: '2023-01-30T03:13:05.765Z',
            }
          ]
        }
      ],
    }
  ],
  projects: [
    id: 'xxxxxxxx-yyyy-xxxx-yyyy-xxxxxxxxxxxx',
    name: 'my-project',
    slug: 'vcs/my-org/my-project',
    variables: [{
      name: 'MY_SECRET',
      value: 'xxxxABC',
    }],
    keys: [
      {
        type: 'deploy-key | github-user-key',
        preferred: true,
        created_at: '2023-01-30T03:13:05.765Z',
        public_key: 'XXX',
        fingerprint: 'XXX',
      }
    ],
    legacyAWSKeys: {
      access_key_id: 'xxx',
      secret_access_key: 'xxx',
    }
  ]
}
```

</details>

## Quick Tips

### Find all projects with Legacy AWS Keys

```bash
jq '.["projects"] | map(select(has("legacyAWSKeys")) | .slug)' circleci-data.json
```

**Returns:**

```bash
[
  "vcs/my-org/my-project"
]
```

**To delete:** https://support.circleci.com/hc/en-us/articles/11990015505947-How-to-remove-legacy-AWS-integration-secrets

(We may build this ability into this tool in the future.)

### Find all Contexts with variables updated in the last 30 days

```bash
jq '.["accounts"][] | .contexts | map(select(.variables[].updated_at >= (now - 302460*60 | strftime("%Y-%m-%dT%H:%M:%SZ")))) | .[].url' circleci-data.json
```

**Returns:**

```bash
"https://circleci.com/<vcs>/<project>/contexts/<id>"
"https://circleci.com/<vcs>/<project>/contexts/<id>"
```

### Find all project variables that contain AWS in the name

```bash
jq '.["projects"] | map(select(.variables[].name | contains("AWS"))) | .[].slug' circleci-data.json
```

**Returns:**

```bash
[
  "vcs/my-org/my-project"
]
```

## F.A.Q.

### Q: Will this tool return the values of my secrets?

A: **No.** This tool will only return the names of the secrets and as much information as can be provided by the CircleCI APIs. CircleCI _does not_ return the values of secrets through their APIs. The information from this tool is for auditing and key rotation purposes.

### Q: What are these 404 and 403 errors I'm seeing?

A: When running this tool with your personal access token, it will probe all accounts and projects within that you _currently_ have an affiliation with. The errors are likely expected and inform you that you may not have access in the case of a 403, or that the project or account no longer exists in the case of a 404. If you are seeing a 403 error, it may still be possible that you had access to the project at one point in the past.

This tool is useful for auditing your personal access. To fully audit an organization, you will need to use an org admin account's token.

### Q: Can I request a feature?

A: **Yes.** Please open an issue or PR!
