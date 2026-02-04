import {
  defineGitHubBlock,
  defineGitHubInputConfig,
} from "../../utils/defineGitHubBlock.ts";
import { getGitHubInstallation } from "../../github.ts";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase.ts";
import { events } from "@slflows/sdk/v1";

const method = defineGitHubInputConfig({
  name: "HTTP Method",
  description: "HTTP method for the request",
  type: {
    enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
  required: true,
});

const path = defineGitHubInputConfig({
  name: "Path",
  description: 'The full API path (e.g., "/repos/octocat/hello-world/issues")',
  type: "string",
  required: true,
});

const requestBody = defineGitHubInputConfig({
  name: "Body",
  description: "Optional request body as key-value pairs",
  type: {
    type: "object",
    additionalProperties: true,
  },
  required: false,
});

const accept = defineGitHubInputConfig({
  name: "Accept Header",
  description:
    'Optional Accept header value (e.g., "application/vnd.github.raw+json")',
  type: "string",
  required: false,
});

export const plainRequest = defineGitHubBlock({
  name: "Plain Request",
  description: "Make a direct request to the GitHub API",
  category: "Request",
  inputConfig: {
    method,
    path,
    requestBody,
    accept,
  },
  outputJsonSchema: {
    type: "object",
    additionalProperties: true,
  },
  onEvent: async ({ event }) => {
    const methodValue = event.inputConfig.method as string;
    const pathValue = event.inputConfig.path as string;
    const bodyValue = event.inputConfig.requestBody as
      | Record<string, unknown>
      | undefined;
    const acceptValue = event.inputConfig.accept as string | undefined;

    const octokit = await getGitHubInstallation();

    const url = `${methodValue} ${pathValue}`;

    try {
      const { data } = await octokit.request(url, {
        ...bodyValue,
        ...(acceptValue
          ? {
              headers: {
                Accept: acceptValue,
              },
            }
          : {}),
      });

      await events.emit(convertKeysToCamelCase(data));
    } catch (err) {
      console.error((err as Error).message);
    }
  },
});
