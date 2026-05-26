import { useCallback } from "react";
import { reverseErrorMessage } from "./reversePanelModel";
import type { ReversePanelAction } from "./reversePanelStateTypes";

interface ReverseRevealPathOptions {
  readonly setAction: (action: ReversePanelAction) => void;
  readonly setError: (error: string) => void;
  readonly setMessage: (message: string) => void;
}

export function useReverseRevealPath(options: ReverseRevealPathOptions) {
  return useCallback(async (path: string) => {
    options.setAction("reveal");
    options.setError("");
    options.setMessage("");
    try {
      const result = await window.nexus.shell.revealPath(requiredPath(path));
      options.setMessage(`已在 Finder 中定位: ${result.path}`);
    } catch (error) {
      options.setError(reverseErrorMessage(error));
    } finally {
      options.setAction("");
    }
  }, [options]);
}

function requiredPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed === "") throw new Error("定位路径不能为空");
  return trimmed;
}
