import { events } from "@slflows/sdk/v1";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase";
import { defineGitHubBlock } from "../../utils/defineGitHubBlock";
import { owner, repo } from "./shared";

export const pushSubscription = defineGitHubBlock({
  name: "On push",
  description: "Subscribes to repository push events",
  category: "Webhooks",
  entrypoint: true,
  outputJsonSchema: "any",
  staticConfig: {
    owner,
    repo,
    branch: {
      name: "Branch",
      description:
        "Filter pushes to a specific branch name (without refs/heads/ prefix). Leave empty for all branches.",
      type: "string",
      required: false,
    },
    includeTags: {
      name: "Include tags",
      description: "Whether to include tag pushes as well as branch pushes.",
      type: "boolean",
      required: false,
    },
  },
  onInternalMessage: async (input) => {
    const payload = input.message.body.payload;
    const { owner, repo, branch, includeTags } = input.block.config;

    if (owner && payload.repository.owner.login !== owner) {
      return;
    }

    if (repo && payload.repository.name !== repo) {
      return;
    }

    const refType = payload.ref.startsWith("refs/tags/")
      ? "tag"
      : payload.ref.startsWith("refs/heads/")
        ? "branch"
        : "other";

    if (refType === "tag" && !includeTags) {
      return;
    }

    if (branch && refType === "branch") {
      const branchName = payload.ref.replace("refs/heads/", "");
      if (branchName !== branch) {
        return;
      }
    }

    await events.emit(convertKeysToCamelCase(payload));
  },
});
