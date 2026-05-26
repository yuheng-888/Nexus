import type { DirectoryEntry } from "../../types/nexus";

const FILE_COLOR_BY_EXTENSION: Readonly<Record<string, string>> = {
  css: "#a78bfa",
  go: "#60a5fa",
  html: "#f87171",
  js: "#f7df1e",
  json: "#fbbf24",
  jsx: "#f7df1e",
  md: "#60a5fa",
  py: "#34d399",
  rs: "#f97316",
  sh: "#34d399",
  svg: "#fbbf24",
  toml: "#fbbf24",
  ts: "#3178c6",
  tsx: "#3178c6",
  yaml: "#f87171",
  yml: "#f87171"
};

const DEFAULT_FILE_COLOR = "#9899b3";

export function getFileColor(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  return FILE_COLOR_BY_EXTENSION[extension] ?? DEFAULT_FILE_COLOR;
}

export function sortDirectoryEntries(entries: readonly DirectoryEntry[]): DirectoryEntry[] {
  return [...entries].sort(compareDirectoryEntries);
}

export function workspaceNameFromPath(root: string): string {
  return root.split("/").filter(Boolean).pop() ?? root;
}

export function formatRecentWorkspaceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `打开最近项目失败: ${message}`;
}

function compareDirectoryEntries(a: DirectoryEntry, b: DirectoryEntry): number {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

  return a.name.localeCompare(b.name);
}
