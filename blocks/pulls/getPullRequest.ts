import { JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo, pullNumber } from "../shared.ts";
import outputSchema from "./getPullRequest.json" with { type: "json" };

export const getPullRequest = defineGitHubBlock({
  name: "Get pull request",
  description: "Get a specific pull request by its number",
  category: "Pull requests",
  url: "GET /repos/{owner}/{repo}/pulls/{pull_number}",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    pullNumber,
  },
});
