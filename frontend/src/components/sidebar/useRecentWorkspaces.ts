import { useCallback, useEffect, useState } from "react";
import { useLanguageStore } from "../../store/languageStore";
import { useStore } from "../../store/useStore";
import { formatRecentWorkspaceError } from "./fileExplorerHelpers";

const RECENT_WORKSPACE_LIMIT = 6;

export function useRecentWorkspaces() {
  const workspaceRoot = useStore((s) => s.workspaceRoot);
  const setWorkspaceRoot = useStore((s) => s.setWorkspaceRoot);
  const clearLanguageState = useLanguageStore((s) => s.clearLanguageState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentWorkspaces, setRecentWorkspaces] = useState<readonly string[]>([]);

  const openRecent = useCallback(async (root: string) => {
    setError("");
    try {
      const info = await window.nexus.workspace.openRecent(root);
      clearLanguageState();
      setWorkspaceRoot(info.root);
    } catch (caught) {
      setError(formatRecentWorkspaceError(caught));
    }
  }, [clearLanguageState, setWorkspaceRoot]);

  useEffect(() => {
    if (workspaceRoot !== null) return;

    return loadRecentWorkspaces(setLoading, setRecentWorkspaces, setError);
  }, [workspaceRoot]);

  return { error, loading, openRecent, recentWorkspaces };
}

function loadRecentWorkspaces(
  setLoading: (loading: boolean) => void,
  setRecentWorkspaces: (roots: readonly string[]) => void,
  setError: (error: string) => void
) {
  let cancelled = false;
  setLoading(true);
  window.nexus.workspace.recent()
    .then((roots) => {
      if (!cancelled) setRecentWorkspaces(roots.slice(0, RECENT_WORKSPACE_LIMIT));
    })
    .catch((caught: unknown) => {
      if (!cancelled) setError(formatRecentWorkspaceError(caught));
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}
