import type {
  GitBranchCheckoutRequest,
  GitBranchCreateRequest,
  GitBranchDeleteRequest,
  GitBranchList,
  GitBranchSummary,
  GitCommandResult,
  GitDiffRequest,
  GitDiffResult,
  GitFetchRequest,
  GitLogRequest,
  GitLogResult,
  GitPullRequest,
  GitPushRequest,
  GitRemote,
  GitRemoteRequest,
  GitStashEntry,
  GitStashPushRequest,
  GitSummary,
  GitStatusResult,
  GitTagCreateRequest
} from "../gitContracts.js";
import { resolveWorkspacePath, toWorkspaceRelativePath } from "./pathGuards.js";
import { runGit } from "./gitRunner.js";
import { parseGitSummary } from "./gitStatusParser.js";

export interface GitServiceOptions {
  readonly workspaceRoot: string | null;
}

const DEFAULT_LOG_LIMIT = 50;
const DEFAULT_STASH_REF = "stash@{0}";

export class GitService {
  private workspaceRoot: string | null;

  constructor(options: GitServiceOptions) {
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  status(cwd = "."): Promise<GitStatusResult> {
    return this.run(["status", "--short", "--branch"], cwd);
  }

  async summary(cwd = "."): Promise<GitSummary> {
    return parseGitSummary(await this.run(["status", "--porcelain=v1", "--branch"], cwd));
  }

  branches(cwd = "."): Promise<GitBranchSummary> {
    return this.summary(cwd).then((summary) => summary.branch);
  }

  async listBranches(cwd = "."): Promise<GitBranchList> {
    const result = await this.run(["branch", "--format=%(refname:short)%09%(HEAD)%09%(upstream:short)"], cwd);
    const branches = result.stdout.split(/\r?\n/).filter(Boolean).map(parseBranchLine);
    return { branches, current: branches.find((branch) => branch.current)?.name ?? "" };
  }

  diff(request: GitDiffRequest = {}): Promise<GitDiffResult> {
    const args = request.staged === true ? ["diff", "--cached"] : ["diff"];
    const path = request.path === undefined ? undefined : this.validatePath(request.path);
    const fullArgs = path === undefined ? args : [...args, "--", path];

    return this.run(fullArgs, request.cwd).then((result) => ({
      ...result,
      path: request.path,
      staged: request.staged === true
    }));
  }

  stage(path: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["add", "--", this.validatePath(path)], cwd);
  }

  unstage(path: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["restore", "--staged", "--", this.validatePath(path)], cwd);
  }

  stageAll(cwd = "."): Promise<GitCommandResult> {
    return this.run(["add", "-A"], cwd);
  }

  unstageAll(cwd = "."): Promise<GitCommandResult> {
    return this.run(["restore", "--staged", "."], cwd);
  }

  async commit(message: string, cwd = "."): Promise<GitCommandResult> {
    const trimmed = requireText(message, "Commit message is required");
    return this.run(["commit", "-m", trimmed], cwd);
  }

  remotes(cwd = "."): Promise<readonly GitRemote[]> {
    return this.run(["remote", "-v"], cwd).then((result) => parseRemotes(result.stdout));
  }

  addRemote(request: GitRemoteRequest, cwd = "."): Promise<GitCommandResult> {
    return this.run(["remote", "add", requireText(request.name, "Remote name is required"), requireText(request.url, "Remote URL is required")], cwd);
  }

  removeRemote(name: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["remote", "remove", requireText(name, "Remote name is required")], cwd);
  }

  fetch(request: GitFetchRequest = {}, cwd = "."): Promise<GitCommandResult> {
    return this.run(["fetch", ...(request.prune === true ? ["--prune"] : []), ...optional(request.remote)], cwd);
  }

  pull(request: GitPullRequest = {}, cwd = "."): Promise<GitCommandResult> {
    return this.run(["pull", ...(request.rebase === true ? ["--rebase"] : []), ...optional(request.remote), ...optional(request.branch)], cwd);
  }

  push(request: GitPushRequest = {}, cwd = "."): Promise<GitCommandResult> {
    return this.run(["push", ...(request.setUpstream === true ? ["-u"] : []), ...optional(request.remote), ...optional(request.branch)], cwd);
  }

  createBranch(request: GitBranchCreateRequest, cwd = "."): Promise<GitCommandResult> {
    return this.run(["branch", requireText(request.name, "Branch name is required"), ...optional(request.startPoint)], cwd);
  }

  checkoutBranch(request: GitBranchCheckoutRequest, cwd = "."): Promise<GitCommandResult> {
    const args = request.create === true ? ["checkout", "-b", request.branch] : ["checkout", request.branch];
    return this.run([...args, ...optional(request.startPoint)], cwd);
  }

  deleteBranch(request: GitBranchDeleteRequest, cwd = "."): Promise<GitCommandResult> {
    return this.run(["branch", request.force === true ? "-D" : "-d", requireText(request.name, "Branch name is required")], cwd);
  }

  async log(request: GitLogRequest = {}, cwd = "."): Promise<GitLogResult> {
    const limit = String(request.limit ?? DEFAULT_LOG_LIMIT);
    const format = "%H%x09%h%x09%an%x09%ae%x09%ad%x09%s";
    const raw = await this.run(["log", `--max-count=${limit}`, "--date=iso-strict", `--pretty=format:${format}`, ...optional(request.ref)], cwd);
    return { entries: parseLog(raw.stdout), raw };
  }

  show(ref: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["show", "--stat", "--patch", requireText(ref, "Git ref is required")], cwd);
  }

  merge(branch: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["merge", requireText(branch, "Branch name is required")], cwd);
  }

  rebase(branch: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["rebase", requireText(branch, "Branch name is required")], cwd);
  }

  abortMerge(cwd = "."): Promise<GitCommandResult> {
    return this.run(["merge", "--abort"], cwd);
  }

  abortRebase(cwd = "."): Promise<GitCommandResult> {
    return this.run(["rebase", "--abort"], cwd);
  }

  stashList(cwd = "."): Promise<readonly GitStashEntry[]> {
    return this.run(["stash", "list"], cwd).then((result) => parseStashes(result.stdout));
  }

  stashPush(request: GitStashPushRequest = {}, cwd = "."): Promise<GitCommandResult> {
    return this.run(["stash", "push", ...(request.includeUntracked === true ? ["-u"] : []), ...messageArgs(request.message)], cwd);
  }

  stashApply(ref = DEFAULT_STASH_REF, cwd = "."): Promise<GitCommandResult> {
    return this.run(["stash", "apply", requireText(ref, "Stash ref is required")], cwd);
  }

  stashPop(ref = DEFAULT_STASH_REF, cwd = "."): Promise<GitCommandResult> {
    return this.run(["stash", "pop", requireText(ref, "Stash ref is required")], cwd);
  }

  stashDrop(ref = DEFAULT_STASH_REF, cwd = "."): Promise<GitCommandResult> {
    return this.run(["stash", "drop", requireText(ref, "Stash ref is required")], cwd);
  }

  discardFile(path: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["restore", "--worktree", "--", this.validatePath(path)], cwd);
  }

  discardAll(cwd = "."): Promise<GitCommandResult> {
    return this.run(["restore", "--worktree", "."], cwd);
  }

  tagList(cwd = "."): Promise<readonly string[]> {
    return this.run(["tag", "--list"], cwd).then((result) => result.stdout.split(/\r?\n/).filter(Boolean));
  }

  createTag(request: GitTagCreateRequest, cwd = "."): Promise<GitCommandResult> {
    const name = requireText(request.name, "Tag name is required");
    return this.run(request.message === undefined ? ["tag", name] : ["tag", "-a", name, "-m", request.message], cwd);
  }

  deleteTag(name: string, cwd = "."): Promise<GitCommandResult> {
    return this.run(["tag", "-d", requireText(name, "Tag name is required")], cwd);
  }

  private run(args: readonly string[], cwd = "."): Promise<GitCommandResult> {
    return runGit(args, this.resolveCwd(cwd));
  }

  private resolveCwd(cwd = "."): string {
    return resolveWorkspacePath(requireWorkspaceRoot(this.workspaceRoot), cwd);
  }

  private validatePath(path: string): string {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const absolutePath = resolveWorkspacePath(workspaceRoot, path);
    return toWorkspaceRelativePath(workspaceRoot, absolutePath);
  }
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

function optional(value: string | undefined): readonly string[] {
  return value === undefined || value.trim() === "" ? [] : [value.trim()];
}

function messageArgs(message: string | undefined): readonly string[] {
  return message === undefined || message.trim() === "" ? [] : ["-m", message.trim()];
}

function parseBranchLine(line: string): { current: boolean; name: string; upstream?: string } {
  const [name = "", head = "", upstream = ""] = line.split("\t");
  return { current: head === "*", name, upstream: upstream === "" ? undefined : upstream };
}

function parseRemotes(stdout: string): readonly GitRemote[] {
  const remotes = new Map<string, string>();
  for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^(\S+)\s+(.+?)\s+\((fetch|push)\)$/);
    if (match?.[1] !== undefined && match[3] === "fetch") remotes.set(match[1], match[2] ?? "");
  }
  return [...remotes].map(([name, url]) => ({ name, url }));
}

function parseLog(stdout: string): GitLogResult["entries"] {
  return stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const [hash = "", shortHash = "", authorName = "", authorEmail = "", date = "", subject = ""] = line.split("\t");
    return { authorEmail, authorName, date, hash, shortHash, subject };
  });
}

function parseStashes(stdout: string): readonly GitStashEntry[] {
  return stdout.split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = line.match(/^(stash@\{(\d+)})\: (?:On ([^:]+)\: )?(.+)$/);
    return {
      branch: match?.[3],
      index: match?.[2] === undefined ? index : Number(match[2]),
      message: match?.[4] ?? line,
      ref: match?.[1] ?? `stash@{${index}}`
    };
  });
}
