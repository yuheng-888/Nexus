import { useCallback, useEffect } from "react";
import { useStore } from "../../store/useStore";
import { createGitPanelActions } from "./gitPanelActions";
import { shouldRefreshGitPanel } from "./gitPanelModel";
import type { GitPanelState } from "./gitPanelStateTypes";
import { loadGitDiff } from "./gitPanelRefresh";
import { clearGitData, useGitDataState } from "./useGitDataState";
import { useGitPanelRuntime } from "./useGitPanelRuntime";

export function useGitPanelState(): GitPanelState {
  const workspaceRoot = useStore((state) => state.workspaceRoot);
  const data = useGitDataState();
  const runtime = useGitPanelRuntime({ selected: data.selected, setters: data.setters });

  const choose = useCallback(async (path: string, staged: boolean) => {
    const next = { path, staged };
    data.setters.setSelected(next);
    await loadGitDiff(next, data.setters.setDiff, runtime.setError);
  }, [data.setters, runtime.setError]);

  const commit = useCallback(async () => {
    await runtime.run("commit", async () => {
      const result = await window.nexus.git.commit(data.commitMessage);
      data.setters.setCommitMessage("");
      data.setters.setDiff(null);
      data.setters.setSelected(null);
      return result;
    });
  }, [data.commitMessage, data.setters, runtime]);

  useEffect(() => {
    if (!shouldRefreshGitPanel(workspaceRoot)) {
      clearGitData(data.setters);
      runtime.setError("");
      return;
    }

    void runtime.refresh();
  }, [data.setters, runtime.refresh, runtime.setError, workspaceRoot]);

  const actions = createGitPanelActions({ choose, commit, data, refresh: runtime.refresh, run: runtime.run });

  return {
    action: runtime.action,
    branches: data.branches,
    commandOutput: runtime.commandOutput,
    commitMessage: data.commitMessage,
    diff: data.diff,
    error: runtime.error,
    loading: runtime.loading,
    log: data.log,
    remotes: data.remotes,
    selected: data.selected,
    stashes: data.stashes,
    summary: data.summary,
    tags: data.tags,
    workspaceRoot,
    ...actions
  };
}
