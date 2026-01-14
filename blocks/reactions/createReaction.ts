import { getGitHubInstallation } from "../../github.ts";
import { events, JsonSchema } from "@slflows/sdk/v1";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock.ts";
import { owner, repo } from "../shared.ts";
import outputSchema from "./createReaction.json" with { type: "json" };
import { contentType, contentId } from "./shared.ts";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase.ts";

export const createReaction = defineGitHubBlock({
  name: "Create reaction",
  description: "Add a reaction to an issue, pull request, or comment",
  category: "Reactions",
  outputJsonSchema: outputSchema as JsonSchema,
  inputConfig: {
    owner,
    repo,
    contentType,
    contentId,
    reactionType: {
      name: "Reaction type",
      description:
        "The type of reaction to add (+1, -1, laugh, confused, heart, hooray, rocket, eyes)",
      type: {
        enum: [
          "+1",
          "-1",
          "laugh",
          "confused",
          "heart",
          "hooray",
          "rocket",
          "eyes",
        ],
      },
      required: true,
    },
  },
  onEvent: async ({ event }) => {
    const octokit = await getGitHubInstallation();
    const { owner, repo, contentType, contentId, reactionType } =
      event.inputConfig;

    let data;

    switch (contentType) {
      case "issue": {
        ({ data } = await octokit.request(
          "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions",
          {
            owner,
            repo,
            issue_number: contentId,
            content: reactionType,
          },
        ));
        break;
      }

      case "issue-comment": {
        ({ data } = await octokit.request(
          "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
          {
            owner,
            repo,
            comment_id: contentId,
            content: reactionType,
          },
        ));
        break;
      }

      default:
        throw new Error(`Invalid content type: ${contentType}`);
    }

    await events.emit(convertKeysToCamelCase(data));
  },
});
