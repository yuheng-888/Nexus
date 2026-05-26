import { useEffect, useState } from "react";
import type { GitSummary } from "../../types/git";

export interface StatusBarGitState {
  readonly error: string;
  readonly loading: boolean;
  readonly summary: GitSummary | null;
  readonly workspaceRoot: string | null;
}

export function statusBarGitLabel(state: StatusBarGitState): string {
  if (state.workspaceRoot === null) return "未打开项目";
  if (state.loading) return "Git 检测中";
  if (state.error !== "") return "Git 状态错误";
  if (state.summary === null) return "Git 未检测";
  if (!state.summary.repository) return "非 Git 仓库";

  return branchLabel(state.summary);
}

export function useStatusBarGitState(workspaceRoot: string | null): StatusBarGitState {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<GitSummary | null>(null);

  useEffect(() => {
    if (workspaceRoot === null) {
      setError("");
      setLoading(false);
      setSummary(null);
      return;
    }

    return loadGitSummary({ setError, setLoading, setSummary });
  }, [workspaceRoot]);

  return { error, loading, summary, workspaceRoot };
}

function branchLabel(summary: GitSummary): string {
  const branch = summary.branch.current === "" ? "Git" : summary.branch.current;
  const ahead = summary.branch.ahead > 0 ? ` ↑${summary.branch.ahead}` : "";
  const behind = summary.branch.behind > 0 ? ` ↓${summary.branch.behind}` : "";

  return `${branch}${ahead}${behind}`;
}

function loadGitSummary(options: {
  readonly setError: (error: string) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly setSummary: (summary: GitSummary | null) => void;
}): () => void {
  let cancelled = false;
  options.setError("");
  options.setLoading(true);
  void window.nexus.git.summary()
    .then((summary) => {
      if (!cancelled) options.setSummary(summary);
    })
    .catch((caught: unknown) => {
      if (!cancelled) options.setError(caught instanceof Error ? caught.message : String(caught));
    })
    .finally(() => {
      if (!cancelled) options.setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}
