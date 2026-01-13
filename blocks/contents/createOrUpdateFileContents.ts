import { getGitHubInstallation } from "../../github.ts";
import { events, JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo } from "../shared.ts";
import outputSchema from "./createOrUpdateFileContents.json" with { type: "json" };
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

export const createOrUpdateFileContents = defineGitHubBlock({
  name: "Create or update file contents",
  description:
    "Create a new file or update an existing file's contents in a repository",
  category: "Contents",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    path,
    message,
    content: {
      name: "File content",
      description: "The new file content, using Base64 encoding.",
      type: "string",
      required: true,
    },
    branch,
    sha: {
      name: "File SHA",
      description:
        "The blob SHA of the file being replaced (required for updating existing files)",
      type: "string",
      required: false,
    },
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
      content,
      branch,
      sha,
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

    const { data: fileUpdate } = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        message,
        content,
        branch,
        sha,
        committer,
        author,
      },
    );

    await events.emit(convertKeysToCamelCase(fileUpdate));
  },
});
