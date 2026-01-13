import { JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import {
  owner,
  repo,
  stateFilter,
  sort,
  direction,
  page,
  perPage,
} from "../shared.ts";
import outputSchema from "./listPullRequests.json" with { type: "json" };

export const listPullRequests = defineGitHubBlock({
  name: "List pull requests",
  description: "Lists pull requests from a repository with pagination support",
  category: "Pull requests",
  url: "GET /repos/{owner}/{repo}/pulls",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    state: stateFilter,
    head: {
      name: "Head",
      description:
        "Filter pulls by head user or head organization and branch name in the format of 'user:ref-name' or 'organization:ref-name'.",
      type: "string",
      required: false,
      apiRequestFieldKey: "head",
    },
    base: {
      name: "Base",
      description: "Filter pulls by base branch name.",
      type: "string",
      required: false,
      apiRequestFieldKey: "base",
    },
    sort,
    direction,
    page,
    perPage,
  },
});
