import { blocks, defineApp, kv, messaging, lifecycle } from "@slflows/sdk/v1";
import { Octokit } from "octokit";
import { getGitHubApp } from "./github.ts";
import { EventPayloadMap, WebhookEvent } from "@octokit/webhooks-types";
import { redirect, json, error } from "./request.ts";
import { randomBytes } from "node:crypto";

import { createBranch } from "./blocks/branches/createBranch.ts";
import { listBranches } from "./blocks/branches/listBranches.ts";

import { issuesSubscription } from "./blocks/webhooks/issuesSubscription.ts";
import { pullRequestSubscription } from "./blocks/webhooks/pullRequestSubscription.ts";
import { pushSubscription } from "./blocks/webhooks/pushSubscription.ts";
import { workflowSubscription } from "./blocks/webhooks/workflowSubscription.ts";
import { issueCommentSubscription } from "./blocks/webhooks/issueCommentSubscription.ts";

import { getCommit } from "./blocks/commits/getCommit.ts";
import { listCommits } from "./blocks/commits/listCommits.ts";

import { deleteFile } from "./blocks/contents/deleteFile.ts";
import { createOrUpdateFileContents } from "./blocks/contents/createOrUpdateFileContents.ts";
import { getFileContents } from "./blocks/contents/getFileContents.ts";

import { getIssue } from "./blocks/issues/getIssue.ts";
import { createIssue } from "./blocks/issues/createIssue.ts";
import { updateIssue } from "./blocks/issues/updateIssue.ts";
import { listIssues } from "./blocks/issues/listIssues.ts";
import { createIssueComment } from "./blocks/issues/createIssueComment.ts";
import { updateIssueComment } from "./blocks/issues/updateIssueComment.ts";
import { deleteIssueComment } from "./blocks/issues/deleteIssueComment.ts";

import { getPullRequest } from "./blocks/pulls/getPullRequest.ts";
import { createPullRequest } from "./blocks/pulls/createPullRequest.ts";
import { listPullRequests } from "./blocks/pulls/listPullRequests.ts";
import { mergePullRequest } from "./blocks/pulls/mergePullRequest.ts";
import { updatePullRequest } from "./blocks/pulls/updatePullRequest.ts";
import { markPullRequestReadyForReview } from "./blocks/pulls/markPullRequestReadyForReview.ts";
import { convertPullRequestToDraft } from "./blocks/pulls/convertPullRequestToDraft.ts";

import { createReaction } from "./blocks/reactions/createReaction.ts";
import { deleteReaction } from "./blocks/reactions/deleteReaction.ts";

import { dispatchRepository } from "./blocks/repos/dispatchRepository.ts";

import { dispatchWorkflow } from "./blocks/actions/dispatchWorkflow.ts";
import { getPullRequestDiff } from "./blocks/pulls/getPullRequestDiff.ts";

type SupportedEventType =
  | "issues"
  | "pull_request"
  | "push"
  | "workflow_run"
  | "issue_comment";

interface EventConfig {
  blockTypeId: string;
  validate: (payload: unknown) => boolean;
}

const EVENT_CONFIG: Record<SupportedEventType, EventConfig> = {
  issues: {
    blockTypeId: "issuesSubscription",
    validate: (payload: unknown): payload is EventPayloadMap["issues"] =>
      !!payload &&
      typeof payload === "object" &&
      "issue" in payload &&
      "action" in payload,
  },
  pull_request: {
    blockTypeId: "pullRequestSubscription",
    validate: (payload: unknown): payload is EventPayloadMap["pull_request"] =>
      !!payload &&
      typeof payload === "object" &&
      "pull_request" in payload &&
      "action" in payload,
  },
  push: {
    blockTypeId: "pushSubscription",
    validate: (payload: unknown): payload is EventPayloadMap["push"] =>
      !!payload &&
      typeof payload === "object" &&
      "ref" in payload &&
      "repository" in payload,
  },
  workflow_run: {
    blockTypeId: "workflowSubscription",
    validate: (payload: unknown): payload is EventPayloadMap["workflow_run"] =>
      !!payload &&
      typeof payload === "object" &&
      "workflow_run" in payload &&
      "action" in payload,
  },
  issue_comment: {
    blockTypeId: "issueCommentSubscription",
    validate: (payload: unknown): payload is EventPayloadMap["issue_comment"] =>
      !!payload &&
      typeof payload === "object" &&
      "comment" in payload &&
      "issue" in payload &&
      "action" in payload,
  },
};

const createGitHubAppPromptKey = "create-github-app-prompt";

export const app = defineApp({
  blocks: {
    createBranch,
    listBranches,

    issuesSubscription,
    pullRequestSubscription,
    pushSubscription,
    workflowSubscription,
    issueCommentSubscription,

    getCommit,
    listCommits,

    deleteFile,
    createOrUpdateFileContents,
    getFileContents,

    getIssue,
    createIssue,
    updateIssue,
    listIssues,
    createIssueComment,
    updateIssueComment,
    deleteIssueComment,

    getPullRequest,
    createPullRequest,
    listPullRequests,
    mergePullRequest,
    updatePullRequest,
    markPullRequestReadyForReview,
    convertPullRequestToDraft,
    getPullRequestDiff,

    createReaction,
    deleteReaction,

    dispatchRepository,

    dispatchWorkflow,
  },
  config: {
    organization: {
      name: "Organization name",
      description: "Enter if you want to create an app for an organization",
      type: "string",
      required: false,
    },
  },
  http: {
    onRequest: async ({ request, app }) => {
      switch (request.path) {
        // Completes the GitHub App creation process after manifest submission.
        // Converts the temporary code to permanent credentials and redirects to GitHub's installation page.
        case "/redirect": {
          const { code, state } = request.query;

          if (!code || !state) {
            return error(request.requestId, 400, "Missing parameters");
          }

          const { value: storedState } = await kv.app.get("state");

          if (!storedState || storedState !== state) {
            return error(request.requestId, 400, "Invalid request");
          }

          const octokit = new Octokit();

          const { data } = await octokit.request(
            "POST /app-manifests/{code}/conversions",
            {
              code,
            },
          );

          await kv.app.set({
            key: "credentials",
            value: {
              clientId: data.client_id,
              clientSecret: data.client_secret,
              webhookSecret: data.webhook_secret,
              pem: data.pem,
            },
          });

          await kv.app.set({
            key: "info",
            value: {
              id: data.id,
              slug: data.slug,
            },
          });

          return redirect(
            request.requestId,
            `https://github.com/apps/${data.slug}/installations/new?state=${state}`,
          );
        }

        // Handles the callback after GitHub App installation.
        // Validates the installation, stores repository access details, and redirects to the app installation page.
        case "/setup": {
          const { installation_id, setup_action, state } = request.query;

          if (
            !installation_id ||
            (setup_action !== "install" && setup_action !== "update")
          ) {
            return error(
              request.requestId,
              400,
              "No installation ID or setup action provided",
            );
          }

          if (setup_action === "install") {
            const { value: storedState } = await kv.app.get("state");

            if (!storedState || storedState !== state) {
              return error(request.requestId, 400, "Invalid request");
            }

            const ghApp = await getGitHubApp();

            const installation = await ghApp.getInstallationOctokit(
              Number(installation_id),
            );

            if (!installation) {
              return error(request.requestId, 400, "Invalid installation ID");
            }

            const { data } = await installation.request(
              "GET /installation/repositories",
              {
                headers: {
                  "X-GitHub-Api-Version": "2022-11-28",
                },
              },
            );

            await kv.app.set({
              key: "installationId",
              value: installation_id,
            });

            await kv.app.set({
              key: "repositories",
              value: data.repositories.map((repo) => repo.full_name),
            });

            await lifecycle.prompt.delete(createGitHubAppPromptKey);

            await kv.app.delete(["state"]);

            await lifecycle.sync();

            return redirect(request.requestId, app.installationUrl);
          }

          return error(request.requestId, 400, "Invalid request");
        }

        // Processes incoming GitHub webhook events and notifies matching subscription blocks.
        case "/webhook": {
          // Headers names are canonicalized by the server
          const { "X-Hub-Signature-256": signature, "X-Github-Event": event } =
            request.headers;

          if (!signature || !event) {
            return error(
              request.requestId,
              400,
              "No signature or event provided",
            );
          }

          try {
            const ghApp = await getGitHubApp();

            await ghApp.webhooks.verify(request.rawBody, signature);

            const payload = request.body as WebhookEvent;

            if (!("installation" in payload) || !payload.installation?.id) {
              return error(
                request.requestId,
                400,
                "No installation ID in webhook payload",
              );
            }

            const { value: storedInstallationId } =
              await kv.app.get("installationId");

            if (storedInstallationId !== payload.installation.id.toString()) {
              return error(
                request.requestId,
                403,
                `Unauthorized installation ID: ${payload.installation.id}, expected ${storedInstallationId}`,
              );
            }

            const eventType = event as string;

            if (!(eventType in EVENT_CONFIG)) {
              return json(request.requestId, {
                message: "Event type not supported",
                eventType,
              });
            }

            const supportedEventType = eventType as SupportedEventType;
            const config = EVENT_CONFIG[supportedEventType];

            if (!config.validate(payload)) {
              return error(
                request.requestId,
                400,
                `Invalid ${eventType} event payload`,
              );
            }

            const listOutput = await blocks.list({
              typeIds: [config.blockTypeId],
            });

            if (listOutput.blocks.length === 0) {
              return json(request.requestId, {
                message: "No subscription blocks found",
                eventType,
              });
            }

            await messaging.sendToBlocks({
              body: {
                headers: request.headers,
                payload: payload,
              },
              blockIds: listOutput.blocks.map((block) => block.id),
            });

            return json(request.requestId, {
              message: "ok",
              eventType,
              blocksNotified: listOutput.blocks.length,
            });
          } catch (err) {
            return error(
              request.requestId,
              400,
              `Invalid request: ${(err as Error).message}`,
            );
          }
        }
      }

      return error(request.requestId, 404, "Not found");
    },
  },
  onSync: async ({ app }) => {
    let [
      { value: installationId },
      { value: state },
      { value: storedOrganization },
    ] = await kv.app.getMany(["installationId", "state", "organization"]);

    if (installationId) {
      const { value: repositories } = await kv.app.get("repositories");

      return {
        newStatus: "ready",
        signalUpdates: {
          repositories,
        },
      };
    }

    const url = app.http.url;

    const manifest = {
      callback_urls: [app.installationUrl],
      default_events: [
        "issues",
        "workflow_run",
        "pull_request",
        "push",
        "issue_comment",
      ],
      default_permissions: {
        issues: "write",
        actions: "write",
        contents: "write",
        pull_requests: "write",
      },
      hook_attributes: {
        url: `${url}/webhook`,
      },
      setup_url: `${url}/setup`,
      name: `Spacelift Flows GH Integration`,
      public: false,
      redirect_url: `${url}/redirect`,
      url: "https://useflows.com",
    };

    if (!state) {
      state = randomBytes(32).toString("hex");

      await kv.app.set({
        key: "state",
        value: state,
      });
    }

    const currentOrganization = app.config.organization;
    const hasOrganizationChanged = storedOrganization !== currentOrganization;
    const hasPrompt = !!app.prompts[createGitHubAppPromptKey];
    const shouldRecreatePrompt = hasOrganizationChanged || !hasPrompt;

    if (shouldRecreatePrompt) {
      if (hasPrompt) {
        await lifecycle.prompt.delete(createGitHubAppPromptKey);
      }

      await lifecycle.prompt.create(
        createGitHubAppPromptKey,
        "Create a new app GitHub App",
        {
          redirect: {
            url: currentOrganization
              ? `https://github.com/organizations/${currentOrganization}/settings/apps/new`
              : `https://github.com/settings/apps/new`,
            method: "POST",
            formFields: {
              manifest: JSON.stringify(manifest),
              state,
            },
          },
        },
      );

      await kv.app.set({
        key: "organization",
        value: currentOrganization,
      });
    }

    return {
      newStatus: "in_progress",
      nextScheduleDelay: null,
    };
  },
});
