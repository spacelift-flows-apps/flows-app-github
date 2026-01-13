import { getGitHubInstallation } from "../../github.ts";
import { events, JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo } from "../shared.ts";
import outputSchema from "./deleteFile.json" with { type: "json" };
import {
  branch,
  message,
  committerName,
  committerEmail,
  authorName,
  authorEmail,
  path,
} from "./shared.ts";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase.ts";

export const deleteFile = defineGitHubBlock({
  name: "Delete file",
  description: "Delete a file from a repository",
  category: "Contents",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    path,
    message,
    sha: {
      name: "File SHA",
      description: "The blob SHA of the file being deleted",
      type: "string",
      required: true,
    },
    branch,
    committerName,
    committerEmail,
    authorName,
    authorEmail,
  },
  onEvent: async ({ event }) => {
    const octokit = await getGitHubInstallation();
    const {
      owner,
      repo,
      path,
      message,
      sha,
      branch,
      committerName,
      committerEmail,
      authorName,
      authorEmail,
    } = event.inputConfig;

    const committer =
      committerName && committerEmail
        ? { name: committerName, email: committerEmail }
        : undefined;

    const author =
      authorName && authorEmail
        ? { name: authorName, email: authorEmail }
        : undefined;

    const { data: deleteResult } = await octokit.request(
      "DELETE /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        message,
        sha,
        branch,
        committer,
        author,
      },
    );

    await events.emit(convertKeysToCamelCase(deleteResult));
  },
});
