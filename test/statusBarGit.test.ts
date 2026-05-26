import { describe, expect, it } from "vitest";
import {
  statusBarGitLabel,
  type StatusBarGitState
} from "../frontend/src/components/layout/statusBarGit.js";

describe("status bar git label", () => {
  it("shows no workspace before a project is opened", () => {
    expect(statusBarGitLabel(state({ workspaceRoot: null }))).toBe("未打开项目");
  });

  it("shows loading while git state is being detected", () => {
    expect(statusBarGitLabel(state({ loading: true }))).toBe("Git 检测中");
  });

  it("shows explicit non repository state", () => {
    expect(statusBarGitLabel(state({ summary: gitSummary({ repository: false }) }))).toBe("非 Git 仓库");
  });

  it("shows the real branch and tracking counts", () => {
    expect(statusBarGitLabel(state({ summary: gitSummary({ ahead: 2, behind: 1, current: "feature/nexus" }) }))).toBe(
      "feature/nexus ↑2 ↓1"
    );
  });

  it("shows an explicit error label", () => {
    expect(statusBarGitLabel(state({ error: "git failed" }))).toBe("Git 状态错误");
  });
});

function state(overrides: Partial<StatusBarGitState> = {}): StatusBarGitState {
  return {
    error: "",
    loading: false,
    summary: null,
    workspaceRoot: "/workspace",
    ...overrides
  };
}

function gitSummary(overrides: {
  readonly ahead?: number;
  readonly behind?: number;
  readonly current?: string;
  readonly repository?: boolean;
}) {
  return {
    branch: {
      ahead: overrides.ahead ?? 0,
      behind: overrides.behind ?? 0,
      current: overrides.current ?? "main",
      detached: false
    },
    changes: [],
    raw: { exitCode: overrides.repository === false ? 128 : 0, stderr: "", stdout: "" },
    repository: overrides.repository ?? true,
    staged: [],
    unstaged: [],
    untracked: []
  };
}
