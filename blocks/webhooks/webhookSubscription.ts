import { events } from "@slflows/sdk/v1";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { owner, repo } from "./shared";

export const webhookSubscription = defineGitHubBlock({
  name: "On Webhook",
  description:
    "Subscribes to all GitHub webhook events. Use this as an escape hatch to receive any webhook event, including those not covered by dedicated subscription blocks.",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: {
    type: "object",
    properties: {
      eventType: {
        type: "string",
        description:
          "The GitHub webhook event type (e.g. 'push', 'issues', 'pull_request', 'release', 'deployment', etc.)",
      },
      payload: {
        description:
          "The full webhook event payload with keys converted to camelCase",
      },
    },
    required: ["eventType", "payload"],
  },
  staticConfig: {
    owner,
    repo,
    eventType: {
      name: "Event type",
      description:
        "Filter to a specific GitHub event type (e.g. 'push', 'issues', 'release', 'deployment'). Leave empty for all events.",
      type: "string",
      required: false,
    },
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload;
    const eventType = input.message.body.eventType as string;
    const { owner, repo, eventType: filterEventType } = input.block.config;

    if (filterEventType && eventType !== filterEventType) {
      return;
    }

    if (owner && payload.repository?.owner?.login !== owner) {
      return;
    }

    if (repo && payload.repository?.name !== repo) {
      return;
    }

    await events.emit({
      eventType,
      payload: convertKeysToCamelCase(payload),
    });
  },
});
