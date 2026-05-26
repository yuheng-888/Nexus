import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../store/useStore";
import type { RagIndexStatus, RagIndexSummary, RagSearchResult } from "../../types/rag";
import { ragErrorMessage } from "./ragPanelModel";

type RagAction = "" | "build" | "clear" | "refresh" | "search";
const SEARCH_LIMIT = 8;

interface RunRagActionOptions {
  readonly action: RagAction;
  readonly setAction: (action: RagAction) => void;
  readonly setError: (error: string) => void;
  readonly task: () => Promise<void>;
}

export interface RagPanelState {
  readonly action: RagAction;
  readonly error: string;
  readonly lastBuild: RagIndexSummary | null;
  readonly query: string;
  readonly results: readonly RagSearchResult[];
  readonly status: RagIndexStatus | null;
  readonly workspaceRoot: string | null;
  buildIndex(): Promise<void>;
  clearIndex(): Promise<void>;
  refresh(): Promise<void>;
  search(): Promise<void>;
  setQuery(query: string): void;
}

export function useRagPanelState(): RagPanelState {
  const workspaceRoot = useStore((state) => state.workspaceRoot);
  const [action, setAction] = useState<RagAction>("refresh");
  const [error, setError] = useState("");
  const [lastBuild, setLastBuild] = useState<RagIndexSummary | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly RagSearchResult[]>([]);
  const [status, setStatus] = useState<RagIndexStatus | null>(null);

  const refresh = useCallback(async () => {
    await runRagAction({ action: "refresh", setAction, setError, task: async () => {
      setStatus(await window.nexus.rag.index.status());
    } });
  }, []);

  const buildIndex = useCallback(async () => {
    await runRagAction({ action: "build", setAction, setError, task: async () => {
      const summary = await window.nexus.rag.index.build();
      setLastBuild(summary);
      setStatus(summary);
    } });
  }, []);

  const clearIndex = useCallback(async () => {
    await runRagAction({ action: "clear", setAction, setError, task: async () => {
      setResults([]);
      setLastBuild(null);
      setStatus(await window.nexus.rag.index.clear());
    } });
  }, []);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed === "") return;
    await runRagAction({ action: "search", setAction, setError, task: async () => {
      setResults(await window.nexus.rag.search({ limit: SEARCH_LIMIT, query: trimmed }));
    } });
  }, [query]);

  useEffect(() => {
    setResults([]);
    setLastBuild(null);
    void refresh();
  }, [refresh, workspaceRoot]);

  return {
    action,
    buildIndex,
    clearIndex,
    error,
    lastBuild,
    query,
    refresh,
    results,
    search,
    setQuery,
    status,
    workspaceRoot
  };
}

async function runRagAction(options: RunRagActionOptions): Promise<void> {
  options.setAction(options.action);
  options.setError("");
  try {
    await options.task();
  } catch (error) {
    options.setError(ragErrorMessage(error));
  } finally {
    options.setAction("");
  }
}
