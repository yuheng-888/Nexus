import type { DirectoryEntry, FileReadResult } from "../../types/nexus";

export interface QuickOpenFileOptions {
  readonly entry: DirectoryEntry;
  readonly openFile: (entry: DirectoryEntry, content: string, mtimeMs: number) => void;
  readonly read: (path: string) => Promise<FileReadResult>;
}

export async function openQuickOpenFile(options: QuickOpenFileOptions): Promise<FileReadResult> {
  const result = await options.read(options.entry.path);

  options.openFile(options.entry, result.content, result.mtimeMs);
  return result;
}
