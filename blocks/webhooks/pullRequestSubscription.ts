import { events } from "@slflows/sdk/v1";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { labels, owner, repo } from "./shared";

export const pullRequestSubscription = defineGitHubBlock({
  name: "On pull request",
  description:
    "Subscribes to pull request events (opened, closed, review requested, etc.)",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: "any",
  staticConfig: {
    owner,
    repo,
    action: {
      name: "Action",
      description:
        "Filter by action type (opened, closed, merged, etc.). Leave empty for all actions.",
      type: {
        enum: [
          "assigned",
          "auto_merge_disabled",
          "auto_merge_enabled",
          "closed",
          "converted_to_draft",
          "demilestoned",
          "dequeued",
          "edited",
          "enqueued",
          "labeled",
          "locked",
          "milestoned",
          "opened",
          "ready_for_review",
          "reopened",
          "review_request_removed",
          "review_requested",
          "synchronize",
          "unassigned",
          "unlabeled",
          "unlocked",
        ],
      },
      required: false,
    },
    baseBranch: {
      name: "Base Branch",
      description:
        "Filter PRs by base branch. Leave empty for all base branches.",
      type: "string",
      required: false,
    },
    labels,
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload as PullRequestEvent;
    const { owner, repo, action, baseBranch, labels } = input.block.config;

    if (owner && payload.repository.owner.login !== owner) {
      return;
    }

    if (repo && payload.repository.name !== repo) {
      return;
    }

    if (action && payload.action !== action) {
      return;
    }

    if (baseBranch && payload.pull_request.base.ref !== baseBranch) {
      return;
    }

    if (payload.pull_request.labels && labels && labels.length > 0) {
      const issueLabels = payload.pull_request.labels.map(
        (label) => label.name,
      );

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
