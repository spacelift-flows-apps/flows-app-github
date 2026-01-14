import { getGitHubInstallation } from "../../github.ts";
import { events, JsonSchema } from "@slflows/sdk/v1";
import outputSchema from "./createBranch.json" with { type: "json" };
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo } from "../shared.ts";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase.ts";

export const createBranch = defineGitHubBlock({
  name: "Create branch",
  description: "Create a new branch in a specified repository",
  category: "Branches",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    branch: {
      name: "Branch name",
      description: "The name of the branch to create",
      type: "string",
      required: true,
    },
    fromBranch: {
      name: "From branch",
      description:
        "The branch to create the new branch from (optional; defaults to repository default branch)",
      type: "string",
      required: false,
    },
  },
  onEvent: async ({ event }) => {
    const octokit = await getGitHubInstallation();
    const owner = event.inputConfig.owner;
    const repo = event.inputConfig.repo;
    const branchName = event.inputConfig.branch;
    let fromBranch = event.inputConfig.fromBranch;

    if (!fromBranch) {
      const { data: repository } = await octokit.request(
        "GET /repos/{owner}/{repo}",
        {
          owner,
          repo,
        },
      );
      fromBranch = repository.default_branch;
    }

    const { data: reference } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
      {
        owner,
        repo,
        branch: fromBranch,
      },
    );

    const { data: createdRef } = await octokit.request(
      "POST /repos/{owner}/{repo}/git/refs",
      {
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: reference.object.sha,
      },
    );

    await events.emit(convertKeysToCamelCase(createdRef));
  },
});
