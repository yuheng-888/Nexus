import { useCallback } from "react";
import type { DialogPathPickRequest } from "../../types/dialog";
import { reverseErrorMessage } from "./reversePanelModel";

interface ReversePathPickerOptions {
  readonly backupPath: string;
  readonly comparePath: string;
  readonly entryPath: string;
  readonly outputPath: string;
  readonly setBackupPath: (path: string) => void;
  readonly setComparePath: (path: string) => void;
  readonly setEntryPath: (path: string) => void;
  readonly setError: (error: string) => void;
  readonly setMessage: (message: string) => void;
  readonly setOutputPath: (path: string) => void;
  readonly setTargetPath: (path: string) => void;
  readonly targetPath: string;
}

export interface ReversePathPickers {
  pickBackupPath(): Promise<void>;
  pickComparePath(): Promise<void>;
  pickEntryPath(): Promise<void>;
  pickOutputAsarPath(): Promise<void>;
  pickOutputDirectory(): Promise<void>;
  pickTargetPath(): Promise<void>;
}

export function useReversePathPickers(options: ReversePathPickerOptions): ReversePathPickers {
  const pickTargetPath = useCallback(() => pickIntoSetter({
    currentPath: options.targetPath,
    request: { mode: "file-or-directory", title: "选择逆向目标" },
    ...pickHandlers(options.setTargetPath, options)
  }), [options]);

  const pickOutputDirectory = useCallback(() => pickIntoSetter({
    currentPath: options.outputPath,
    request: { mode: "directory", title: "选择输出目录" },
    ...pickHandlers(options.setOutputPath, options)
  }), [options]);

  const pickOutputAsarPath = useCallback(() => pickIntoSetter({
    currentPath: options.outputPath,
    request: { filters: asarFilters(), mode: "save-file", title: "选择输出 ASAR" },
    ...pickHandlers(options.setOutputPath, options)
  }), [options]);

  const pickComparePath = useCallback(() => pickIntoSetter({
    currentPath: options.comparePath,
    request: { filters: asarFilters(), mode: "file", title: "选择对比 ASAR" },
    ...pickHandlers(options.setComparePath, options)
  }), [options]);

  const pickEntryPath = useCallback(() => pickIntoSetter({
    currentPath: options.entryPath,
    request: { filters: javascriptFilters(), mode: "file", title: "选择入口 JavaScript" },
    ...pickHandlers(options.setEntryPath, options)
  }), [options]);

  const pickBackupPath = useCallback(() => pickIntoSetter({
    currentPath: options.backupPath,
    request: { mode: "file", title: "选择 jshook 备份文件" },
    ...pickHandlers(options.setBackupPath, options)
  }), [options]);

  return { pickBackupPath, pickComparePath, pickEntryPath, pickOutputAsarPath, pickOutputDirectory, pickTargetPath };
}

async function pickIntoSetter(options: {
  readonly currentPath: string;
  readonly request: DialogPathPickRequest;
  readonly setError: (error: string) => void;
  readonly setMessage: (message: string) => void;
  readonly setPath: (path: string) => void;
}): Promise<void> {
  options.setError("");
  try {
    const result = await window.nexus.dialog.pickPath({
      ...options.request,
      defaultPath: options.currentPath.trim() || undefined
    });
    if (result.canceled) return;
    options.setPath(requirePickedPath(result.path));
    options.setMessage("");
  } catch (error) {
    options.setError(reverseErrorMessage(error));
  }
}

function pickHandlers(
  setPath: (path: string) => void,
  options: Pick<ReversePathPickerOptions, "setError" | "setMessage">
) {
  return { setError: options.setError, setMessage: options.setMessage, setPath };
}

function requirePickedPath(path: string | null): string {
  if (path === null) throw new Error("Dialog completed without a selected path");
  return path;
}

function asarFilters(): DialogPathPickRequest["filters"] {
  return [{ extensions: ["asar"], name: "ASAR archives" }];
}

function javascriptFilters(): DialogPathPickRequest["filters"] {
  return [{ extensions: ["js", "cjs", "mjs"], name: "JavaScript" }];
}
