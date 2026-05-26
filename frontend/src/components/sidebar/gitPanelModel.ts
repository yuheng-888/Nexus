import type { GitBranchItem, GitCommandResult, GitFileChange, GitHubPublishResult, GitLogEntry, GitRemote } from "../../types/git";

interface GitEmptyStateInput {
  readonly repository: boolean;
  readonly stderr: string;
  readonly workspaceRoot: string | null;
}

export function sortGitBranches(branches: readonly GitBranchItem[]): readonly GitBranchItem[] {
  return [...branches].sort(compareBranches);
}

export function formatRemoteSummary(remote: GitRemote): string {
  return `${remote.name} · ${remote.url}`;
}

export function formatBranchMeta(branch: GitBranchItem): string {
  const parts = [branch.current ? "当前" : "", branch.upstream ?? ""].filter(Boolean);
  return parts.length === 0 ? "本地分支" : parts.join(" · ");
}

export function formatGitLogMeta(entry: GitLogEntry): string {
  return `${entry.shortHash} · ${entry.authorName} · ${formatGitDate(entry.date)}`;
}

export function formatGitCommandResult(result: GitCommandResult): string {
  const body = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
  const exitLine = result.exitCode === 0 ? "" : `退出码 ${result.exitCode}`;
  const text = [exitLine, body].filter(Boolean).join("\n");

  return text === "" ? "命令已执行，无输出" : text;
}

export function formatGitHubPublishResult(result: GitHubPublishResult): string {
  const commit = result.commit === null ? (result.commitSkippedReason ?? "没有新的提交") : "已提交";
  return [
    `仓库: ${result.repository.htmlUrl}`,
    `远端: ${result.remoteName} (${result.remoteAction === "added" ? "已添加" : "已更新"})`,
    `分支: ${result.branch}`,
    `提交: ${commit}`,
    "推送完成"
  ].join("\n");
}

export function gitChangeStatusLabel(change: GitFileChange): string {
  if (change.untracked) return "U";
  if (change.status === "modified") return "M";
  if (change.status === "added") return "A";
  if (change.status === "deleted") return "D";
  if (change.status === "renamed") return "R";
  if (change.status === "copied") return "C";

  return "?";
}

export function shouldRefreshGitPanel(workspaceRoot: string | null): boolean {
  return workspaceRoot !== null;
}

export function gitEmptyStateText(input: GitEmptyStateInput): string {
  if (input.workspaceRoot === null) return "尚未打开项目";
  if (!input.repository) return input.stderr || "当前项目不是 Git 仓库";
  return "加载 Git 状态...";
}

function compareBranches(a: GitBranchItem, b: GitBranchItem): number {
  if (a.current !== b.current) return a.current ? -1 : 1;

  return a.name.localeCompare(b.name);
}

function formatGitDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().replace("T", " ").slice(0, 16);
}
