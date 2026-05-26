import { useCallback } from "react";
import { useStore } from "../../store/useStore";
import { useEditorNavigationStore } from "../../store/editorNavigationStore";
import { isAbsoluteEditorPath, type EditorLocation } from "./editorNavigation";

export function useOpenEditorLocation(): (location: EditorLocation) => Promise<void> {
  const openFile = useStore((state) => state.openFile);
  const requestNavigation = useEditorNavigationStore((state) => state.requestNavigation);

  return useCallback(async (location: EditorLocation) => {
    const result = await readEditorLocationFile(location.path);
    openFile({
      absolutePath: result.absolutePath,
      isDirectory: false,
      name: fileName(result.path),
      path: result.path
    }, result.content, result.mtimeMs);
    requestNavigation({ ...location, path: result.path });
  }, [openFile, requestNavigation]);
}

async function readEditorLocationFile(path: string) {
  return isAbsoluteEditorPath(path)
    ? window.nexus.file.readAbsolute(path)
    : window.nexus.file.read(path);
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
