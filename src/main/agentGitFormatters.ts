import type {
  GitBranchList,
  GitBranchSummary,
  GitCommandResult,
  GitDiffResult,
  GitLogResult,
  GitRemote,
  GitStashEntry,
  GitSummary
} from "../gitContracts.js";

export function formatGitCommandResult(result: GitCommandResult): string {
  const stdout = result.stdout.trimEnd();
  const stderr = result.stderr.trimEnd();
  return [
    `exitCode=${result.exitCode}`,
    stdout === "" ? "stdout: <empty>" : `stdout:\n${stdout}`,
    stderr === "" ? "" : `stderr:\n${stderr}`
  ].filter(Boolean).join("\n");
}

export function formatGitDiffResult(result: GitDiffResult): string {
  return [
    `staged=${result.staged}`,
    result.path === undefined ? "" : `path=${result.path}`,
    formatGitCommandResult(result)
  ].filter(Boolean).join("\n");
}

export function formatGitSummary(summary: GitSummary): string {
  return [
    `repository: ${summary.repository}`,
    formatGitBranchSummary(summary.branch),
    `changes: ${summary.changes.length}`,
    `staged: ${summary.staged.map((change) => change.path).join(", ") || "<none>"}`,
    `unstaged: ${summary.unstaged.map((change) => change.path).join(", ") || "<none>"}`,
    `untracked: ${summary.untracked.map((change) => change.path).join(", ") || "<none>"}`
  ].join("\n");
}

export function formatGitBranchSummary(branch: GitBranchSummary): string {
  return [
    `current: ${branch.current}`,
    `detached: ${branch.detached}`,
    `ahead: ${branch.ahead}`,
    `behind: ${branch.behind}`,
    branch.upstream === undefined ? "" : `upstream: ${branch.upstream}`
  ].filter(Boolean).join("\n");
}

export function formatGitBranchList(list: GitBranchList): string {
  if (list.branches.length === 0) return "No Git branches.";
  return list.branches.map((branch) => [
    `${branch.current ? "*" : " "} ${branch.name}`,
    branch.upstream === undefined ? "" : `upstream: ${branch.upstream}`
  ].filter(Boolean).join(" ")).join("\n");
}

export function formatGitLog(result: GitLogResult): string {
  if (result.entries.length === 0) return "No Git commits.";
  return result.entries.map((entry) => [
    `${entry.shortHash} ${entry.subject}`,
    `author: ${entry.authorName} <${entry.authorEmail}>`,
    `date: ${entry.date}`
  ].join("\n")).join("\n\n");
}

export function formatGitRemotes(remotes: readonly GitRemote[]): string {
  if (remotes.length === 0) return "No Git remotes.";
  return remotes.map((remote) => `${remote.name} ${remote.url}`).join("\n");
}

export function formatGitStashes(stashes: readonly GitStashEntry[]): string {
  if (stashes.length === 0) return "No Git stashes.";
  return stashes.map((stash) => [
    `${stash.ref}: ${stash.message}`,
    stash.branch === undefined ? "" : `branch: ${stash.branch}`
  ].filter(Boolean).join("\n")).join("\n\n");
}

export function formatGitTags(tags: readonly string[]): string {
  return tags.length === 0 ? "No Git tags." : tags.join("\n");
}
