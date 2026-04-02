import { events } from "@slflows/sdk/v1";
import { IssueCommentEvent } from "@octokit/webhooks-types";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { owner, repo } from "./shared";

export const issueCommentSubscription = defineGitHubBlock({
  name: "On issue comment",
  description:
    "Subscribes to issue and pull request comment events (created, edited, deleted)",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: "any",
  staticConfig: {
    owner,
    repo,
    action: {
      name: "Action",
      description:
        "Filter by action type (created, edited, deleted). Leave empty for all actions.",
      type: {
        enum: ["created", "edited", "deleted"],
      },
      required: false,
    },
    issueNumber: {
      name: "Issue/PR Number",
      description:
        "Filter by issue or PR number. Leave empty for all issues/PRs.",
      type: "number",
      required: false,
    },
    authorLogin: {
      name: "Author",
      description:
        "Filter by comment author username. Leave empty for all authors.",
      type: "string",
      required: false,
    },
    isPullRequest: {
      name: "Pull request comments only",
      description:
        "If true, only emit events for comments on pull requests (not regular issues).",
      type: "boolean",
      required: false,
    },
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload as IssueCommentEvent;
    const { owner, repo, action, issueNumber, authorLogin, isPullRequest } =
      input.block.config;

    if (owner && payload.repository.owner.login !== owner) {
      return;
    }

    if (repo && payload.repository.name !== repo) {
      return;
    }

    if (action && payload.action !== action) {
      return;
    }

    if (issueNumber !== undefined && payload.issue.number !== issueNumber) {
      return;
    }

    if (authorLogin && payload.comment.user.login !== authorLogin) {
      return;
    }

    if (isPullRequest === true) {
      if (!payload.issue.pull_request) {
        return;
      }
    }

    await events.emit(convertKeysToCamelCase(payload));
  },
});
