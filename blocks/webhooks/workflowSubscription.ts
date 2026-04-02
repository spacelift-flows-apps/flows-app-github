import { events } from "@slflows/sdk/v1";
import { WorkflowRunEvent } from "@octokit/webhooks-types";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { owner, repo } from "./shared";

export const workflowSubscription = defineGitHubBlock({
  name: "On workflow",
  description: "Subscribes to GitHub Actions workflow status changes",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: "any",
  staticConfig: {
    owner,
    repo,
    action: {
      name: "Action",
      description:
        "Filter by action type (requested, completed, etc.). Leave empty for all actions.",
      type: {
        enum: ["requested", "completed", "in_progress"],
      },
      required: false,
    },
    workflowName: {
      name: "Workflow name",
      description: "Filter by workflow name. Leave empty for all workflows.",
      type: "string",
      required: false,
    },
    conclusion: {
      name: "Conclusion",
      description:
        "Filter by workflow conclusion (success, failure, cancelled, etc). Only applies to 'completed' events.",
      type: {
        enum: [
          "success",
          "failure",
          "neutral",
          "cancelled",
          "timed_out",
          "action_required",
          "stale",
          "skipped",
        ],
      },
      required: false,
    },
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload as WorkflowRunEvent;
    const { owner, repo, action, workflowName, conclusion } =
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

    if (
      workflowName &&
      payload.workflow &&
      payload.workflow.name !== workflowName
    ) {
      return;
    }

    if (
      conclusion &&
      payload.action === "completed" &&
      payload.workflow_run &&
      payload.workflow_run.conclusion !== conclusion
    ) {
      return;
    }

    await events.emit(convertKeysToCamelCase(payload));
  },
});
