import { JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo, pullNumber } from "../shared.ts";
import outputSchema from "./mergePullRequest.json" with { type: "json" };

export const mergePullRequest = defineGitHubBlock({
  name: "Merge pull request",
  description: "Merges a pull request with specified merge method",
  category: "Pull requests",
  url: "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    pullNumber,
    commitTitle: {
      name: "Commit title",
      description: "Title for the automatic commit message",
      type: "string",
      required: false,
      apiRequestFieldKey: "commit_title",
    },
    commitMessage: {
      name: "Commit message",
      description: "Extra detail to append to automatic commit message",
      type: "string",
      required: false,
      apiRequestFieldKey: "commit_message",
    },
    mergeMethod: {
      name: "Merge method",
      description: "Merge method to use (merge, squash, rebase)",
      type: "string",
      required: false,
      apiRequestFieldKey: "merge_method",
    },
    sha: {
      name: "SHA",
      description: "SHA that pull request head must match to allow merge",
      type: "string",
      required: false,
      apiRequestFieldKey: "sha",
    },
  },
});
