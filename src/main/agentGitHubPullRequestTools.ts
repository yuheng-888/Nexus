import type {
  GitHubPullRequest,
  GitHubPullRequestCreateRequest,
  GitHubPullRequestReview,
  GitHubRepositoryRequest
} from "../gitContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalBoolean, readOptionalString, readRequiredString } from "./agentToolArgs.js";
import type { GitHubPrService } from "./gitHubPrService.js";

export interface AgentGitHubPullRequestToolProvider {
  createPullRequest(args: Record<string, unknown>): Promise<string>;
  listPullRequestReviews(args: Record<string, unknown>): Promise<string>;
  listPullRequests(args: Record<string, unknown>): Promise<string>;
  previewCreatePullRequest(args: Record<string, unknown>): Promise<string>;
}

const MAX_REVIEW_BODY_CHARS = 800;

export class NativeAgentGitHubPullRequestToolProvider implements AgentGitHubPullRequestToolProvider {
  private readonly service: GitHubPrService;

  constructor(options: { readonly service: GitHubPrService }) {
    this.service = options.service;
  }

  async createPullRequest(args: Record<string, unknown>): Promise<string> {
    return formatPullRequest(await this.service.createPullRequest(readCreateRequest(args)));
  }

  async listPullRequestReviews(args: Record<string, unknown>): Promise<string> {
    const reviews = await this.service.listPullRequestReviews({
      ...readRepositoryRequest(args),
      number: readRequiredNumber(args, "number")
    });
    return formatReviews(reviews);
  }

  async listPullRequests(args: Record<string, unknown>): Promise<string> {
    const pulls = await this.service.listPullRequests({
      ...readRepositoryRequest(args),
      state: readPullRequestState(args)
    });
    return formatPullRequests(pulls);
  }

  async previewCreatePullRequest(args: Record<string, unknown>): Promise<string> {
    const request = readCreateRequest(args);
    return [
      `Create GitHub PR: ${request.title}`,
      `base: ${request.base ?? "main"}`,
      request.head === undefined ? "" : `head: ${request.head}`,
      request.draft === true ? "draft: true" : "",
      formatRepositoryTarget(request)
    ].filter(Boolean).join("\n");
  }
}

export function createGitHubPullRequestToolSpecs(
  provider: AgentGitHubPullRequestToolProvider | undefined
): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "List GitHub pull requests for the workspace repository.",
      name: "github.pr.list",
      parameters: "token: string, state?: open|closed|all, owner?: string, repo?: string, remoteName?: string",
      permission: "read",
      run: (args) => requireProvider(provider).listPullRequests(args)
    },
    {
      description: "List reviews for a GitHub pull request.",
      name: "github.pr.reviews",
      parameters: "token: string, number: number, owner?: string, repo?: string, remoteName?: string",
      permission: "read",
      run: (args) => requireProvider(provider).listPullRequestReviews(args)
    },
    {
      description: "Create a GitHub pull request.",
      name: "github.pr.create",
      parameters: "token: string, title: string, body?: string, head?: string, base?: string, draft?: boolean, owner?: string, repo?: string, remoteName?: string",
      permission: "write",
      preview: (args) => requireProvider(provider).previewCreatePullRequest(args),
      run: (args) => requireProvider(provider).createPullRequest(args)
    }
  ];
}

function readCreateRequest(args: Record<string, unknown>): GitHubPullRequestCreateRequest {
  return {
    ...readRepositoryRequest(args),
    base: readOptionalString(args, "base"),
    body: readOptionalString(args, "body"),
    draft: readOptionalBoolean(args, "draft"),
    head: readOptionalString(args, "head"),
    title: readRequiredString(args, "title")
  };
}

function readRepositoryRequest(args: Record<string, unknown>): GitHubRepositoryRequest {
  return {
    owner: readOptionalString(args, "owner"),
    remoteName: readOptionalString(args, "remoteName"),
    repo: readOptionalString(args, "repo"),
    token: readRequiredString(args, "token")
  };
}

function readPullRequestState(args: Record<string, unknown>): "all" | "closed" | "open" | undefined {
  const state = readOptionalString(args, "state");
  if (state === undefined || state === "all" || state === "closed" || state === "open") return state;
  throw new Error(`Unsupported GitHub PR state: ${state}`);
}

function readRequiredNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Tool argument required: ${key}`);
  }
  return value;
}

function formatPullRequests(pulls: readonly GitHubPullRequest[]): string {
  if (pulls.length === 0) return "No GitHub pull requests found.";
  return pulls.map(formatPullRequest).join("\n\n");
}

function formatPullRequest(pull: GitHubPullRequest): string {
  return [
    `PR #${pull.number}: ${pull.title}`,
    `状态: ${pull.state}`,
    `分支: ${pull.headRef} -> ${pull.baseRef}`,
    `作者: ${pull.authorLogin}`,
    `链接: ${pull.htmlUrl}`
  ].join("\n");
}

function formatReviews(reviews: readonly GitHubPullRequestReview[]): string {
  if (reviews.length === 0) return "No GitHub pull request reviews found.";
  return reviews.map(formatReview).join("\n\n");
}

function formatReview(review: GitHubPullRequestReview): string {
  return [
    `Review #${review.id}: ${review.state} by ${review.authorLogin}`,
    review.submittedAt === undefined ? "" : `提交时间: ${review.submittedAt}`,
    `链接: ${review.htmlUrl}`,
    review.body === "" ? "" : `内容: ${truncate(review.body)}`
  ].filter(Boolean).join("\n");
}

function formatRepositoryTarget(request: GitHubRepositoryRequest): string {
  if (request.owner !== undefined && request.repo !== undefined) return `repo: ${request.owner}/${request.repo}`;
  return `remote: ${request.remoteName ?? "origin"}`;
}

function requireProvider(
  provider: AgentGitHubPullRequestToolProvider | undefined
): AgentGitHubPullRequestToolProvider {
  if (provider === undefined) throw new Error("GitHub pull request tools are not configured.");
  return provider;
}

function truncate(value: string): string {
  if (value.length <= MAX_REVIEW_BODY_CHARS) return value;
  return `${value.slice(0, MAX_REVIEW_BODY_CHARS)}\n... truncated ${value.length - MAX_REVIEW_BODY_CHARS} chars`;
}
