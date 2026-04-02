import { events } from "@slflows/sdk/v1";
import { IssuesEvent } from "@octokit/webhooks-types";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { labels, owner, repo } from "./shared";

export const issuesSubscription = defineGitHubBlock({
  name: "On issue",
  description: "Subscribes to issue events (created, updated, closed, etc.)",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: "any",
  staticConfig: {
    owner,
    repo,
    action: {
      name: "Action",
      description:
        "Filter by action type (opened, closed, edited, etc.). Leave empty for all actions.",
      type: {
        enum: [
          "opened",
          "closed",
          "edited",
          "reopened",
          "assigned",
          "unassigned",
          "labeled",
          "unlabeled",
          "milestoned",
          "demilestoned",
          "pinned",
          "unpinned",
          "locked",
          "unlocked",
          "transferred",
        ],
      },
      required: false,
    },
    labels,
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload as IssuesEvent;
    const { owner, repo, action, labels } = input.block.config;

    if (owner && payload.repository.owner.login !== owner) {
      return;
    }

    if (repo && payload.repository.name !== repo) {
      return;
    }

    if (action && payload.action !== action) {
      return;
    }

    if (payload.issue.labels && labels && labels.length > 0) {
      const issueLabels = payload.issue.labels.map((label) => label.name);

      const hasMatchingLabel = labels.some((label: string) =>
        issueLabels.includes(label),
      );

      if (!hasMatchingLabel) {
        return;
      }
    }

    await events.emit(convertKeysToCamelCase(payload));
  },
});
