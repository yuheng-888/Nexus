import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type {
  GitCommandResult,
  GitHubPublishRequest,
  GitHubPublishResult,
  GitHubRepository,
  GitPublishSafetyFinding,
  GitPublishSafetyReport
} from "../gitContracts.js";
import { runGit } from "./gitRunner.js";
import type { GitService } from "./gitService.js";

export interface GitPublishServiceOptions {
  readonly fetch?: typeof fetch;
  readonly git: GitService;
  readonly workspaceRoot: string | null;
}

const DEFAULT_BRANCH = "main";
const DEFAULT_COMMIT_MESSAGE = "Initial publish";
const DEFAULT_REMOTE = "origin";
const GITHUB_REPOS_URL = "https://api.github.com/user/repos";
const MAX_SCAN_BYTES = 1024 * 1024;
const SKIPPED_DIRECTORIES = new Set([".git", "coverage", "dist", "node_modules", "out", "vendor"]);
const DEFAULT_GITIGNORE_LINES = [
  "node_modules/",
  "frontend/node_modules/",
  "dist/",
  "frontend/dist/",
  "dist-packaged/",
  "vendor/",
  ".DS_Store",
  ".env",
  ".env.*",
  "*.log"
];
const BLOCKED_FILE_NAMES = new Set([".env", ".npmrc"]);
const BLOCKED_EXTENSIONS = [".pem", ".p12", ".key", ".mobileprovision"];
const BLOCKED_CONTENT_PATTERNS: readonly { readonly message: string; readonly pattern: RegExp }[] = [
  { message: "Contains a local /Users path", pattern: /\/Users\/[^\s"'`]+/ },
  { message: "Contains a GitHub token-like value", pattern: /gho_[A-Za-z0-9_]+/ },
  { message: "Contains an OpenAI key-like value", pattern: /sk-[A-Za-z0-9]{12,}/ },
  { message: "Contains a Google API key-like value", pattern: /AIza[0-9A-Za-z_-]{20,}/ }
];

export class GitPublishService {
  private readonly fetchImpl: typeof fetch;
  private readonly git: GitService;
  private workspaceRoot: string | null;

  constructor(options: GitPublishServiceOptions) {
    this.fetchImpl = options.fetch ?? fetch;
    this.git = options.git;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async publishSafetyScan(): Promise<GitPublishSafetyReport> {
    const root = requireWorkspaceRoot(this.workspaceRoot);
    const files = await collectFiles(root);
    const nested = await Promise.all(files.map((file) => scanFile(root, file)));
    const findings = nested.flat();

    return {
      blocked: findings.some((finding) => finding.severity === "blocker"),
      checkedFiles: files.length,
      findings
    };
  }

  async publishToGitHub(request: GitHubPublishRequest): Promise<GitHubPublishResult> {
    const root = requireWorkspaceRoot(this.workspaceRoot);
    const prepared = prepareRequest(request);
    await ensureGitignore(root);
    const safety = await this.publishSafetyScan();
    if (safety.blocked) throw new Error(formatSafetyError(safety));

    const init = await ensureRepository(this.git, prepared.branch);
    await configureAuthor(root, request);
    const commit = await commitWorkspace(root, this.git, prepared.commitMessage);
    const repository = await createGitHubRepository(this.fetchImpl, prepared);
    const remote = await upsertRemote(root, prepared.remoteName, repository.cloneUrl);
    const push = await this.git.push({ branch: prepared.branch, remote: prepared.remoteName, setUpstream: true });
    requireOk(push, "Git push failed");

    return { branch: prepared.branch, commit, init, push, remote: remote.result, remoteAction: remote.action, remoteName: prepared.remoteName, repository, safety };
  }
}

async function collectFiles(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : collectFiles(absolutePath);
    return entry.isFile() ? [absolutePath] : [];
  }));

  return nested.flat();
}

async function scanFile(root: string, file: string): Promise<readonly GitPublishSafetyFinding[]> {
  const relativePath = toRelativePath(root, file);
  const nameFinding = scanFileName(relativePath);
  const contentFindings = await scanFileContent(relativePath, file);
  return [...nameFinding, ...contentFindings];
}

function scanFileName(path: string): readonly GitPublishSafetyFinding[] {
  const name = basename(path);
  const blocked = BLOCKED_FILE_NAMES.has(name) || BLOCKED_EXTENSIONS.some((extension) => name.endsWith(extension));
  return blocked ? [finding(path, "file-name", "Sensitive file name is blocked")] : [];
}

async function scanFileContent(path: string, file: string): Promise<readonly GitPublishSafetyFinding[]> {
  const metadata = await stat(file);
  if (metadata.size > MAX_SCAN_BYTES) return [];

  const content = await readFile(file, "utf8");
  return BLOCKED_CONTENT_PATTERNS
    .filter((entry) => entry.pattern.test(content))
    .map((entry) => finding(path, "file-content", entry.message));
}

function finding(
  path: string,
  type: GitPublishSafetyFinding["type"],
  message: string
): GitPublishSafetyFinding {
  return { message, path, severity: "blocker", type };
}

async function ensureGitignore(root: string): Promise<void> {
  const path = join(root, ".gitignore");
  const current = await readOptionalFile(path);
  const lines = new Set(current.split(/\r?\n/).filter(Boolean));
  const missing = DEFAULT_GITIGNORE_LINES.filter((line) => !lines.has(line));
  if (missing.length === 0) return;

  const prefix = current.trimEnd() === "" ? "" : `${current.trimEnd()}\n`;
  await writeFile(path, `${prefix}${missing.join("\n")}\n`);
}

async function readOptionalFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function ensureRepository(git: GitService, branch: string): Promise<GitCommandResult | null> {
  const summary = await git.summary();
  if (summary.repository) return null;

  const result = await git.init({ branch });
  requireOk(result, "Git init failed");
  return result;
}

async function configureAuthor(root: string, request: GitHubPublishRequest): Promise<void> {
  if (request.authorName?.trim()) requireOk(await runGit(["config", "user.name", request.authorName.trim()], root), "Git author name config failed");
  if (request.authorEmail?.trim()) requireOk(await runGit(["config", "user.email", request.authorEmail.trim()], root), "Git author email config failed");
}

async function commitWorkspace(root: string, git: GitService, message: string): Promise<GitCommandResult | null> {
  requireOk(await git.stageAll(), "Git stage failed");
  const status = await runGit(["status", "--porcelain"], root);
  requireOk(status, "Git status failed");
  if (status.stdout.trim() === "") return null;

  const commit = await git.commit(message);
  requireOk(commit, "Git commit failed");
  return commit;
}

async function createGitHubRepository(
  fetchImpl: typeof fetch,
  request: RequiredPublishRequest
): Promise<GitHubRepository> {
  const response = await fetchImpl(GITHUB_REPOS_URL, {
    body: JSON.stringify({ description: request.description, name: request.name, private: request.visibility === "private" }),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${request.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    method: "POST"
  });
  return readGitHubRepository(response);
}

async function readGitHubRepository(response: Response): Promise<GitHubRepository> {
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub repository create failed: HTTP ${response.status}; ${body.slice(0, 300)}`);

  const value = JSON.parse(body) as Record<string, unknown>;
  return {
    cloneUrl: readString(value, "clone_url"),
    fullName: readString(value, "full_name"),
    htmlUrl: readString(value, "html_url"),
    name: readString(value, "name"),
    private: value.private === true,
    sshUrl: readString(value, "ssh_url")
  };
}

async function upsertRemote(
  root: string,
  name: string,
  url: string
): Promise<{ readonly action: "added" | "updated"; readonly result: GitCommandResult }> {
  const existing = await runGit(["remote", "get-url", name], root);
  const args = existing.exitCode === 0 ? ["remote", "set-url", name, url] : ["remote", "add", name, url];
  const result = await runGit(args, root);
  requireOk(result, "Git remote update failed");
  return { action: existing.exitCode === 0 ? "updated" : "added", result };
}

interface RequiredPublishRequest extends Required<Pick<GitHubPublishRequest, "branch" | "commitMessage" | "name" | "remoteName" | "token" | "visibility">> {
  readonly description: string;
}

function prepareRequest(request: GitHubPublishRequest): RequiredPublishRequest {
  return {
    branch: requireText(request.branch ?? DEFAULT_BRANCH, "Branch is required"),
    commitMessage: requireText(request.commitMessage ?? DEFAULT_COMMIT_MESSAGE, "Commit message is required"),
    description: request.description?.trim() ?? "",
    name: requireText(request.name, "Repository name is required"),
    remoteName: requireText(request.remoteName ?? DEFAULT_REMOTE, "Remote name is required"),
    token: requireText(request.token, "GitHub token is required"),
    visibility: request.visibility
  };
}

function requireWorkspaceRoot(workspaceRoot: string | null): string {
  if (workspaceRoot === null) throw new Error("No workspace is open");
  return workspaceRoot;
}

function requireText(value: string, message: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new Error(message);
  return trimmed;
}

function requireOk(result: GitCommandResult, message: string): void {
  if (result.exitCode === 0) return;
  throw new Error(`${message}: ${result.stderr || result.stdout || `exit ${result.exitCode}`}`);
}

function formatSafetyError(report: GitPublishSafetyReport): string {
  const details = report.findings.map((item) => `${item.path}: ${item.message}`).join("\n");
  return `Publish safety scan blocked this upload:\n${details}`;
}

function readString(value: Record<string, unknown>, key: string): string {
  const raw = value[key];
  if (typeof raw !== "string") throw new Error(`GitHub response missing ${key}`);
  return raw;
}

function toRelativePath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}
