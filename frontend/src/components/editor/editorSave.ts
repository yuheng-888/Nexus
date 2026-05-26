import type { FileReadResult } from "../../types/nexus";
import { isAbsoluteEditorPath } from "./editorNavigation";

export type SaveWrite = (path: string, content: string) => Promise<FileReadResult>;
export type MarkTabSaved = (path: string, mtimeMs: number) => void;

export interface SaveEditorTabOptions {
  readonly content: string;
  readonly markSaved: MarkTabSaved;
  readonly path: string;
  readonly write: SaveWrite;
  readonly writeAbsolute: SaveWrite;
}

export async function saveEditorTab(options: SaveEditorTabOptions): Promise<FileReadResult> {
  const write = isAbsoluteEditorPath(options.path) ? options.writeAbsolute : options.write;
  const result = await write(options.path, options.content);
  options.markSaved(result.path, result.mtimeMs);
  return result;
}
