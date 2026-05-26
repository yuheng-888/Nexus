export interface GitCommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type GitStatusResult = GitCommandResult;

export type GitChangeStatus =
  | "added"
  | "copied"
  | "deleted"
  | "modified"
  | "renamed"
  | "unknown"
  | "untracked";

export interface GitBranchSummary {
  readonly ahead: number;
  readonly behind: number;
  readonly current: string;
  readonly detached: boolean;
  readonly upstream?: string;
}

export interface GitFileChange {
  readonly indexStatus: string;
  readonly originalPath?: string;
  readonly path: string;
  readonly staged: boolean;
  readonly status: GitChangeStatus;
  readonly untracked: boolean;
  readonly unstaged: boolean;
  readonly workingTreeStatus: string;
}

export interface GitSummary {
  readonly branch: GitBranchSummary;
  readonly changes: readonly GitFileChange[];
  readonly raw: GitCommandResult;
  readonly repository: boolean;
  readonly staged: readonly GitFileChange[];
  readonly unstaged: readonly GitFileChange[];
  readonly untracked: readonly GitFileChange[];
}

export interface GitDiffRequest {
  readonly cwd?: string;
  readonly path?: string;
  readonly staged?: boolean;
}

export interface GitDiffResult extends GitCommandResult {
  readonly path?: string;
  readonly staged: boolean;
}

export interface GitRemote {
  readonly name: string;
  readonly url: string;
}

export interface GitRemoteRequest {
  readonly name: string;
  readonly url: string;
}

export interface GitFetchRequest {
  readonly prune?: boolean;
  readonly remote?: string;
}

export interface GitPullRequest {
  readonly branch?: string;
  readonly rebase?: boolean;
  readonly remote?: string;
}

export interface GitPushRequest {
  readonly branch?: string;
  readonly remote?: string;
  readonly setUpstream?: boolean;
}

export interface GitBranchItem {
  readonly current: boolean;
  readonly name: string;
  readonly upstream?: string;
}

export interface GitBranchList {
  readonly branches: readonly GitBranchItem[];
  readonly current: string;
}

export interface GitBranchCreateRequest {
  readonly name: string;
  readonly startPoint?: string;
}

export interface GitBranchCheckoutRequest {
  readonly branch: string;
  readonly create?: boolean;
  readonly startPoint?: string;
}

export interface GitBranchDeleteRequest {
  readonly force?: boolean;
  readonly name: string;
}

export interface GitLogRequest {
  readonly limit?: number;
  readonly ref?: string;
}

export interface GitLogEntry {
  readonly authorEmail: string;
  readonly authorName: string;
  readonly date: string;
  readonly hash: string;
  readonly shortHash: string;
  readonly subject: string;
}

export interface GitLogResult {
  readonly entries: readonly GitLogEntry[];
  readonly raw: GitCommandResult;
}

export interface GitStashEntry {
  readonly branch?: string;
  readonly index: number;
  readonly message: string;
  readonly ref: string;
}

export interface GitStashPushRequest {
  readonly includeUntracked?: boolean;
  readonly message?: string;
}

export interface GitTagCreateRequest {
  readonly message?: string;
  readonly name: string;
}

export interface GitInitRequest {
  readonly branch?: string;
}

export type GitHubRepositoryVisibility = "private" | "public";

export interface GitPublishSafetyFinding {
  readonly message: string;
  readonly path: string;
  readonly severity: "blocker" | "warning";
  readonly type: "file-name" | "file-content";
}

export interface GitPublishSafetyReport {
  readonly blocked: boolean;
  readonly checkedFiles: number;
  readonly findings: readonly GitPublishSafetyFinding[];
}

export interface GitHubPublishRequest {
  readonly authorEmail?: string;
  readonly authorName?: string;
  readonly branch?: string;
  readonly commitMessage?: string;
  readonly description?: string;
  readonly name: string;
  readonly remoteName?: string;
  readonly token: string;
  readonly visibility: GitHubRepositoryVisibility;
}

export interface GitHubRepository {
  readonly cloneUrl: string;
  readonly fullName: string;
  readonly htmlUrl: string;
  readonly name: string;
  readonly private: boolean;
  readonly sshUrl: string;
}

export interface GitHubPublishResult {
  readonly branch: string;
  readonly commit: GitCommandResult | null;
  readonly commitSkippedReason?: string;
  readonly init: GitCommandResult | null;
  readonly push: GitCommandResult;
  readonly remote: GitCommandResult;
  readonly remoteAction: "added" | "updated";
  readonly remoteName: string;
  readonly repository: GitHubRepository;
  readonly safety: GitPublishSafetyReport;
}

export interface NexusGitApi {
  abortMerge(): Promise<GitCommandResult>;
  abortRebase(): Promise<GitCommandResult>;
  addRemote(request: GitRemoteRequest): Promise<GitCommandResult>;
  branches(cwd?: string): Promise<GitBranchSummary>;
  checkoutBranch(request: GitBranchCheckoutRequest): Promise<GitCommandResult>;
  commit(message: string): Promise<GitCommandResult>;
  createBranch(request: GitBranchCreateRequest): Promise<GitCommandResult>;
  createTag(request: GitTagCreateRequest): Promise<GitCommandResult>;
  deleteBranch(request: GitBranchDeleteRequest): Promise<GitCommandResult>;
  deleteTag(name: string): Promise<GitCommandResult>;
  diff(request: GitDiffRequest): Promise<GitDiffResult>;
  discardAll(): Promise<GitCommandResult>;
  discardFile(path: string): Promise<GitCommandResult>;
  fetch(request?: GitFetchRequest): Promise<GitCommandResult>;
  init(request?: GitInitRequest): Promise<GitCommandResult>;
  listBranches(cwd?: string): Promise<GitBranchList>;
  log(request?: GitLogRequest): Promise<GitLogResult>;
  merge(branch: string): Promise<GitCommandResult>;
  pull(request?: GitPullRequest): Promise<GitCommandResult>;
  publishSafetyScan(): Promise<GitPublishSafetyReport>;
  publishToGitHub(request: GitHubPublishRequest): Promise<GitHubPublishResult>;
  push(request?: GitPushRequest): Promise<GitCommandResult>;
  rebase(branch: string): Promise<GitCommandResult>;
  removeRemote(name: string): Promise<GitCommandResult>;
  remotes(cwd?: string): Promise<readonly GitRemote[]>;
  show(ref: string): Promise<GitCommandResult>;
  stage(path: string): Promise<GitCommandResult>;
  stageAll(): Promise<GitCommandResult>;
  stashApply(ref?: string): Promise<GitCommandResult>;
  stashDrop(ref?: string): Promise<GitCommandResult>;
  stashList(): Promise<readonly GitStashEntry[]>;
  stashPop(ref?: string): Promise<GitCommandResult>;
  stashPush(request?: GitStashPushRequest): Promise<GitCommandResult>;
  status(cwd?: string): Promise<GitStatusResult>;
  summary(cwd?: string): Promise<GitSummary>;
  tagList(): Promise<readonly string[]>;
  unstage(path: string): Promise<GitCommandResult>;
  unstageAll(): Promise<GitCommandResult>;
}
