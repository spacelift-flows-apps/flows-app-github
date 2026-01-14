import { JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo } from "../shared.ts";
import outputSchema from "./createPullRequest.json" with { type: "json" };
import { title, body, base } from "./shared.ts";

export const createPullRequest = defineGitHubBlock({
  name: "Create pull request",
  description: "Create a new pull request",
  category: "Pull requests",
  url: "POST /repos/{owner}/{repo}/pulls",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    title,
    head: {
      name: "Head",
      description:
        "The name of the branch where your changes are implemented. For cross-repository pull requests in the same network, namespace head with a user like this: username:branch.",
      type: "string",
      required: true,
      apiRequestFieldKey: "head",
    },
    base,
    body,
    draft: {
      name: "Draft",
      description: "Indicates whether the pull request is a draft",
      type: "boolean",
      required: false,
      apiRequestFieldKey: "draft",
    },
  },
});
