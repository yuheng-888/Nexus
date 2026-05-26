import type {
  GitBranchList,
  GitDiffResult,
  GitLogEntry,
  GitRemote,
  GitStashEntry,
  GitSummary
} from "../../types/git";

export interface DiffSelection {
  readonly path: string;
  readonly staged: boolean;
}

export interface GitPanelState {
  readonly action: string;
  readonly branches: GitBranchList | null;
  readonly commandOutput: string;
  readonly commitMessage: string;
  readonly diff: GitDiffResult | null;
  readonly error: string;
  readonly loading: boolean;
  readonly log: readonly GitLogEntry[];
  readonly remotes: readonly GitRemote[];
  readonly selected: DiffSelection | null;
  readonly stashes: readonly GitStashEntry[];
  readonly summary: GitSummary | null;
  readonly tags: readonly string[];
  readonly workspaceRoot: string | null;
  addRemote(name: string, url: string): Promise<void>;
  abortMerge(): Promise<void>;
  abortRebase(): Promise<void>;
  checkoutBranch(branch: string): Promise<void>;
  choose(path: string, staged: boolean): Promise<void>;
  commit(): Promise<void>;
  createBranch(name: string): Promise<void>;
  createTag(name: string, message?: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  deleteTag(name: string): Promise<void>;
  fetchRemote(remote?: string): Promise<void>;
  mergeBranch(branch: string): Promise<void>;
  pullRemote(remote?: string): Promise<void>;
  pushRemote(remote?: string): Promise<void>;
  rebaseBranch(branch: string): Promise<void>;
  refresh(): Promise<void>;
  removeRemote(name: string): Promise<void>;
  run(label: string, task: () => Promise<unknown>): Promise<void>;
  setCommitMessage(message: string): void;
  showCommit(ref: string): Promise<void>;
  stashApply(ref?: string): Promise<void>;
  stashDrop(ref?: string): Promise<void>;
  stashPop(ref?: string): Promise<void>;
  stashPush(message?: string, includeUntracked?: boolean): Promise<void>;
}
