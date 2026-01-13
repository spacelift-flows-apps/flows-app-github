import { AppBlock, AppBlockConfigField, events } from "@slflows/sdk/v1";
import { getGitHubInstallation } from "../github";
import { EndpointKeys, Endpoints, RequestHeaders, Route } from "@octokit/types";
import { convertKeysToCamelCase } from "./convertKeysToCamelCase";

interface GitHubBlockInputConfigParams<T extends string>
  extends Pick<
    AppBlockConfigField,
    "name" | "description" | "type" | "required"
  > {
  apiRequestFieldKey?: T;
}

export function defineGitHubInputConfig<T extends string>(
  params: GitHubBlockInputConfigParams<T>,
): GitHubBlockInputConfigParams<T> {
  return params;
}

interface GitHubBlockConfigParams<T extends string>
  extends Pick<
    AppBlockConfigField,
    "name" | "description" | "type" | "required"
  > {
  apiRequestFieldKey?: T;
}

export function defineGitHubBlockConfig<T extends string>(
  params: GitHubBlockConfigParams<T>,
): GitHubBlockConfigParams<T> {
  return params;
}

function mapBlockConfig(
  blockConfig: Record<string, GitHubBlockConfigParams<string>>,
): Record<string, AppBlockConfigField> {
  return Object.fromEntries(
    Object.entries(blockConfig).map(([key, value]) => [
      key,
      {
        name: value.name,
        description: value.description,
        type: value.type,
        required: value.required,
      },
    ]),
  );
}

function mapInputConfig(
  inputConfig: Record<string, GitHubBlockInputConfigParams<string>>,
): Record<string, AppBlockConfigField> {
  return Object.fromEntries(
    Object.entries(inputConfig).map(([key, value]) => [
      key,
      {
        name: value.name,
        description: value.description,
        type: value.type,
        required: value.required,
      },
    ]),
  );
}

type GitHubBlockParams<R extends Route> = {
  name: string;
  description: string;
  category: string;
  inputConfig?: Record<
    string,
    GitHubBlockInputConfigParams<
      R extends EndpointKeys ? keyof Endpoints[R]["parameters"] & string : any
    >
  >;
  staticConfig?: Record<string, any>;
  outputJsonSchema: NonNullable<
    NonNullable<AppBlock["outputs"]>[string]["type"]
  >;
  onInternalMessage?: AppBlock["onInternalMessage"];
} & (
  | {
      url: EndpointKeys | R;
      headers?: RequestHeaders;
    }
  | {
      onEvent: NonNullable<AppBlock["inputs"]>[string]["onEvent"];
    }
  | {
      onInternalMessage: AppBlock["onInternalMessage"];
    }
);

export function defineGitHubBlock<R extends Route>(
  params: GitHubBlockParams<R>,
): AppBlock {
  return {
    name: params.name,
    description: params.description,
    category: params.category,
    outputs: {
      default: {
        type: params.outputJsonSchema,
        possiblePrimaryParents: params.inputConfig ? ["default"] : undefined,
      },
    },
    config: params.staticConfig
      ? mapBlockConfig(params.staticConfig)
      : undefined,
    inputs:
      params.inputConfig && !("onInternalMessage" in params)
        ? {
            default: {
              config: mapInputConfig(params.inputConfig),
              onEvent:
                "onEvent" in params
                  ? params.onEvent
                  : async ({ event }) => {
                      const octokit = await getGitHubInstallation();

                      const { data } = await octokit.request(params.url, {
                        ...(params.inputConfig
                          ? Object.fromEntries(
                              Object.entries(params.inputConfig).map(
                                ([key, value]) => [
                                  value.apiRequestFieldKey,
                                  event.inputConfig[key],
                                ],
                              ),
                            )
                          : {}),
                        headers: params.headers,
                      });

                      await events.emit(convertKeysToCamelCase(data));
                    },
            },
          }
        : undefined,
    onInternalMessage: params.onInternalMessage,
  };
}
