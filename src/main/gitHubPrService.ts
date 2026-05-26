import type {
  GitHubPullRequest,
  GitHubPullRequestCreateRequest,
  GitHubPullRequestListRequest,
  GitHubPullRequestReview,
  GitHubPullRequestReviewListRequest,
  GitHubRepositoryRequest
} from "../gitContracts.js";
import type { GitService } from "./gitService.js";

export interface GitHubPrServiceOptions {
  readonly fetch?: typeof fetch;
  readonly git: GitService;
  readonly workspaceRoot: string | null;
}

interface GitHubRepositoryRef {
  readonly owner: string;
  readonly repo: string;
}

const DEFAULT_BASE_BRANCH = "main";
const DEFAULT_REMOTE = "origin";
const GITHUB_API_URL = "https://api.github.com";

export class GitHubPrService {
  private readonly fetchImpl: typeof fetch;
  private readonly git: GitService;
  private workspaceRoot: string | null;

  constructor(options: GitHubPrServiceOptions) {
    this.fetchImpl = options.fetch ?? fetch;
    this.git = options.git;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async createPullRequest(request: GitHubPullRequestCreateRequest): Promise<GitHubPullRequest> {
    const repo = await this.resolveRepository(request);
    const body = {
      base: request.base?.trim() || DEFAULT_BASE_BRANCH,
      body: request.body ?? "",
      draft: request.draft === true,
      head: request.head?.trim() || await this.requireCurrentBranch(),
      title: requireText(request.title, "Pull request title is required")
    };
    const response = await this.request(request.token, `/repos/${repo.owner}/${repo.repo}/pulls`, {
      body: JSON.stringify(body),
      method: "POST"
    });
    return toPullRequest(response);
  }

  async listPullRequests(request: GitHubPullRequestListRequest): Promise<readonly GitHubPullRequest[]> {
    const repo = await this.resolveRepository(request);
    const state = request.state ?? "open";
    const response = await this.request(request.token, `/repos/${repo.owner}/${repo.repo}/pulls?state=${state}`);
    return readArray(response).map(toPullRequest);
  }

  async listPullRequestReviews(
    request: GitHubPullRequestReviewListRequest
  ): Promise<readonly GitHubPullRequestReview[]> {
    const repo = await this.resolveRepository(request);
    const response = await this.request(request.token, `/repos/${repo.owner}/${repo.repo}/pulls/${request.number}/reviews`);
    return readArray(response).map(toReview);
  }

  private async resolveRepository(request: GitHubRepositoryRequest): Promise<GitHubRepositoryRef> {
    if (request.owner?.trim() && request.repo?.trim()) {
      return { owner: request.owner.trim(), repo: request.repo.trim() };
    }

    const remotes = await this.git.remotes();
    const remote = remotes.find((item) => item.name === (request.remoteName ?? DEFAULT_REMOTE));
    if (remote === undefined) throw new Error(`Git remote not found: ${request.remoteName ?? DEFAULT_REMOTE}`);
    return parseGitHubRemote(remote.url);
  }

  private async requireCurrentBranch(): Promise<string> {
    const branch = await this.git.branches();
    if (branch.detached || branch.current.trim() === "") throw new Error("Current branch is detached");
    return branch.current;
  }

  private async request(token: string, path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchImpl(`${GITHUB_API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${requireText(token, "GitHub token is required")}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    return readJsonResponse(response);
  }
}

function parseGitHubRemote(url: string): GitHubRepositoryRef {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/#?]+?)(?:\.git)?$/);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Git remote is not a GitHub repository: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub API failed: HTTP ${response.status}; ${text.slice(0, 300)}`);
  return JSON.parse(text) as unknown;
}

function toPullRequest(value: unknown): GitHubPullRequest {
  const item = readRecord(value);
  return {
    authorLogin: readNestedString(item, "user", "login"),
    baseRef: readNestedString(item, "base", "ref"),
    headRef: readNestedString(item, "head", "ref"),
    htmlUrl: readString(item, "html_url"),
    number: readNumber(item, "number"),
    state: readString(item, "state"),
    title: readString(item, "title")
  };
}

function toReview(value: unknown): GitHubPullRequestReview {
  const item = readRecord(value);
  return {
    authorLogin: readNestedString(item, "user", "login"),
    body: readOptionalString(item, "body") ?? "",
    htmlUrl: readString(item, "html_url"),
    id: readNumber(item, "id"),
    state: readString(item, "state"),
    submittedAt: readOptionalString(item, "submitted_at")
  };
}

function readArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("GitHub response must be an array");
  return value;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("GitHub response item must be an object");
  }
  return value as Record<string, unknown>;
}

function readNestedString(value: Record<string, unknown>, parent: string, key: string): string {
  return readString(readRecord(value[parent]), key);
}

function readString(value: Record<string, unknown>, key: string): string {
  const raw = value[key];
  if (typeof raw !== "string") throw new Error(`GitHub response missing ${key}`);
  return raw;
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const raw = value[key];
  return typeof raw === "string" ? raw : undefined;
}

function readNumber(value: Record<string, unknown>, key: string): number {
  const raw = value[key];
  if (typeof raw !== "number") throw new Error(`GitHub response missing ${key}`);
  return raw;
}

function requireText(value: string, message: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new Error(message);
  return trimmed;
}
