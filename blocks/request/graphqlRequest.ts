import {
  defineGitHubBlock,
  defineGitHubInputConfig,
} from "../../utils/defineGitHubBlock.ts";
import { getGitHubInstallation } from "../../github.ts";
import { convertKeysToCamelCase } from "../../utils/convertKeysToCamelCase.ts";
import { events } from "@slflows/sdk/v1";

const query = defineGitHubInputConfig({
  name: "Query",
  description: "The GraphQL query string",
  type: "string",
  required: true,
});

const variables = defineGitHubInputConfig({
  name: "Variables",
  description: "Optional variables for the GraphQL query",
  type: {
    type: "object",
    additionalProperties: true,
  },
  required: false,
});

export const graphqlRequest = defineGitHubBlock({
  name: "GraphQL Request",
  description: "Make a GraphQL request to the GitHub API",
  category: "Request",
  inputConfig: {
    query,
    variables,
  },
  outputJsonSchema: {
    type: "object",
    additionalProperties: true,
  },
  onEvent: async ({ event }) => {
    const queryValue = event.inputConfig.query as string;
    const variablesValue = event.inputConfig.variables as
      | Record<string, unknown>
      | undefined;

    const octokit = await getGitHubInstallation();

    try {
      const data = await octokit.graphql<Record<string, unknown>>(
        queryValue,
        variablesValue,
      );

      await events.emit(convertKeysToCamelCase(data));
    } catch (err) {
      console.error((err as Error).message);
    }
  },
});
