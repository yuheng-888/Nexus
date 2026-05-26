import { useCallback, useState } from "react";
import type { GitCommandResult, GitHubPublishResult } from "../../types/git";
import type { DiffSelection } from "./gitPanelStateTypes";
import { refreshGitData } from "./gitPanelRefresh";
import { formatGitCommandResult, formatGitHubPublishResult } from "./gitPanelModel";
import type { GitDataSetters } from "./useGitDataState";

export interface GitPanelRuntime {
  readonly action: string;
  readonly commandOutput: string;
  readonly error: string;
  readonly loading: boolean;
  refresh(): Promise<void>;
  run(label: string, task: () => Promise<unknown>): Promise<void>;
  setError(message: string): void;
}

export function useGitPanelRuntime(options: {
  readonly selected: DiffSelection | null;
  readonly setters: GitDataSetters;
}): GitPanelRuntime {
  const [action, setAction] = useState("");
  const [commandOutput, setCommandOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await refreshGitData(options);
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [options.selected, options.setters]);

  const run = useCallback(async (label: string, task: () => Promise<unknown>) => {
    setAction(label);
    setCommandOutput("");
    setError("");
    try {
      const result = await task();
      setCommandOutput(formatTaskResult(result));
      await refresh();
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setAction("");
    }
  }, [refresh]);

  return { action, commandOutput, error, loading, refresh, run, setError };
}

function formatTaskResult(result: unknown): string {
  if (isGitCommandResult(result)) return formatGitCommandResult(result);
  if (isGitHubPublishResult(result)) return formatGitHubPublishResult(result);
  return "";
}

function isGitCommandResult(value: unknown): value is GitCommandResult {
  return typeof value === "object" && value !== null
    && "exitCode" in value && "stdout" in value && "stderr" in value;
}

function isGitHubPublishResult(value: unknown): value is GitHubPublishResult {
  return typeof value === "object" && value !== null
    && "repository" in value && "push" in value && "safety" in value;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
