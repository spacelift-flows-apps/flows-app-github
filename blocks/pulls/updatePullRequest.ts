import { JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo, pullNumber, stateUpdate } from "../shared.ts";
import outputSchema from "./updatePullRequest.json" with { type: "json" };
import { title, body, base } from "./shared.ts";

export const updatePullRequest = defineGitHubBlock({
  name: "Update pull request",
  description: "Update an existing pull request",
  category: "Pull requests",
  url: "PATCH /repos/{owner}/{repo}/pulls/{pull_number}",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    pullNumber,
    title,
    body,
    state: stateUpdate,
    base,
  },
});
