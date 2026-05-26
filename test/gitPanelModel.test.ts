import { describe, expect, it } from "vitest";
import {
  formatBranchMeta,
  formatGitCommandResult,
  formatGitLogMeta,
  gitEmptyStateText,
  formatRemoteSummary,
  gitChangeStatusLabel,
  shouldRefreshGitPanel,
  sortGitBranches
} from "../frontend/src/components/sidebar/gitPanelModel.js";
import type { GitBranchItem, GitCommandResult, GitFileChange, GitLogEntry, GitRemote } from "../frontend/src/types/git.js";

describe("git panel model", () => {
  it("sorts the current branch first and keeps the rest alphabetical", () => {
    expect(sortGitBranches(branches()).map((branch) => branch.name)).toEqual([
      "feature/nexus",
      "develop",
      "main"
    ]);
  });

  it("formats remote summaries", () => {
    expect(formatRemoteSummary(remote())).toBe("origin · git@example.test:nexus.git");
  });

  it("formats commit metadata for history rows", () => {
    expect(formatGitLogMeta(commit())).toContain("abc1234 · Ada · 2026");
  });

  it("formats command results with stdout, stderr, and exit code evidence", () => {
    expect(formatGitCommandResult(result({ stdout: "ok\n" }))).toBe("ok");
    expect(formatGitCommandResult(result({ exitCode: 1, stderr: "boom\n" }))).toBe("退出码 1\nboom");
    expect(formatGitCommandResult(result({ stdout: "", stderr: "" }))).toBe("命令已执行，无输出");
  });

  it("formats branch metadata without hiding ahead or behind counts", () => {
    expect(formatBranchMeta({ current: true, name: "main", upstream: "origin/main" })).toBe("当前 · origin/main");
    expect(formatBranchMeta({ current: false, name: "feature" })).toBe("本地分支");
  });

  it("labels file changes consistently for compact rows", () => {
    expect(gitChangeStatusLabel(change({ status: "modified" }))).toBe("M");
    expect(gitChangeStatusLabel(change({ status: "deleted" }))).toBe("D");
    expect(gitChangeStatusLabel(change({ status: "untracked", untracked: true }))).toBe("U");
  });

  it("uses a no-workspace empty state instead of refreshing Git remotely", () => {
    expect(shouldRefreshGitPanel(null)).toBe(false);
    expect(shouldRefreshGitPanel("/workspace/app")).toBe(true);
    expect(gitEmptyStateText({ repository: false, stderr: "", workspaceRoot: null })).toBe("尚未打开项目");
    expect(gitEmptyStateText({ repository: false, stderr: "fatal: not a git repository", workspaceRoot: "/workspace/app" })).toBe("fatal: not a git repository");
  });
});

function branches(): readonly GitBranchItem[] {
  return [
    { current: false, name: "main" },
    { current: true, name: "feature/nexus", upstream: "origin/feature/nexus" },
    { current: false, name: "develop" }
  ];
}

function remote(): GitRemote {
  return { name: "origin", url: "git@example.test:nexus.git" };
}

function commit(): GitLogEntry {
  return {
    authorEmail: "ada@example.test",
    authorName: "Ada",
    date: "2026-05-26T10:30:00.000Z",
    hash: "abc123456789",
    shortHash: "abc1234",
    subject: "Ship Nexus git panel"
  };
}

function result(overrides: Partial<GitCommandResult>): GitCommandResult {
  return {
    exitCode: overrides.exitCode ?? 0,
    stderr: overrides.stderr ?? "",
    stdout: overrides.stdout ?? ""
  };
}

function change(overrides: Partial<GitFileChange>): GitFileChange {
  return {
    indexStatus: overrides.indexStatus ?? " ",
    originalPath: overrides.originalPath,
    path: overrides.path ?? "src/index.ts",
    staged: overrides.staged ?? false,
    status: overrides.status ?? "modified",
    untracked: overrides.untracked ?? false,
    unstaged: overrides.unstaged ?? true,
    workingTreeStatus: overrides.workingTreeStatus ?? "M"
  };
}
