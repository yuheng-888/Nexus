import { useCallback, useEffect } from "react";
import { useStore } from "../store/useStore";

export function useFileTree() {
  const workspaceRoot = useStore((s) => s.workspaceRoot);
  const setFileTree = useStore((s) => s.setFileTree);
  const openFile = useStore((s) => s.openFile);

  const refreshTree = useCallback(async () => {
    if (workspaceRoot === null) {
      setFileTree([]);
      return;
    }

    try {
      const entries = await window.nexus.file.list();
      setFileTree(entries);
    } catch (err) {
      console.error("Failed to list files:", err);
    }
  }, [setFileTree, workspaceRoot]);

  const openWorkspace = useCallback(async () => {
    const info = await window.nexus.workspace.open();

    if (info?.root === undefined || info.root === null) {
      return null;
    }

    return info.root;
  }, []);

  const loadDir = useCallback(
    async (path: string) => {
      try {
        return await window.nexus.file.list(path);
      } catch (err) {
        console.error("Failed to list directory:", err);
        return [];
      }
    },
    []
  );

  const openFileByEntry = useCallback(
    async (path: string, name: string, absolutePath: string) => {
      try {
        const result = await window.nexus.file.read(path);
        openFile({ path, name, absolutePath, isDirectory: false }, result.content, result.mtimeMs);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    },
    [openFile]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      try {
        await window.nexus.file.write(path, content);
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    },
    []
  );

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  return { openWorkspace, refreshTree, loadDir, openFileByEntry, saveFile };
}
