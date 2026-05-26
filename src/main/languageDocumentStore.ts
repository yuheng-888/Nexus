import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { resolveWorkspacePath, toWorkspaceRelativePath } from "./pathGuards.js";

export interface LanguageDocumentSnapshot {
  readonly content: string;
  readonly fileName: string;
  readonly languageId: string;
  readonly path: string;
  readonly version: number;
}

export class LanguageDocumentStore {
  private readonly documents = new Map<string, LanguageDocumentSnapshot>();
  private workspaceRoot: string | null;

  constructor(workspaceRoot: string | null) {
    this.workspaceRoot = workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
    this.documents.clear();
  }

  open(input: { readonly content: string; readonly languageId?: string; readonly path: string }): void {
    const normalized = this.normalizePath(input.path);
    const existing = this.documents.get(normalized.path);

    this.documents.set(normalized.path, {
      content: input.content,
      fileName: normalized.fileName,
      languageId: input.languageId ?? languageIdFromPath(input.path),
      path: normalized.path,
      version: (existing?.version ?? 0) + 1
    });
  }

  async get(path: string): Promise<LanguageDocumentSnapshot> {
    const normalized = this.normalizePath(path);
    const cached = this.documents.get(normalized.path);
    if (cached !== undefined) return cached;

    const content = await readFile(normalized.fileName, "utf8");
    const metadata = await stat(normalized.fileName);
    return {
      content,
      fileName: normalized.fileName,
      languageId: languageIdFromPath(path),
      path: normalized.path,
      version: Math.floor(metadata.mtimeMs)
    };
  }

  getOpenFileNames(): readonly string[] {
    return [...this.documents.values()].map((document) => document.fileName);
  }

  getOpenByFileName(fileName: string): LanguageDocumentSnapshot | undefined {
    return [...this.documents.values()].find((document) => document.fileName === fileName);
  }

  requireWorkspaceRoot(): string {
    if (this.workspaceRoot === null) throw new Error("No workspace is open");
    return this.workspaceRoot;
  }

  toRelativePath(fileName: string): string {
    return toWorkspaceRelativePath(this.requireWorkspaceRoot(), fileName);
  }

  private normalizePath(path: string): { readonly fileName: string; readonly path: string } {
    const workspaceRoot = this.requireWorkspaceRoot();
    const fileName = resolveWorkspacePath(workspaceRoot, path);
    return { fileName, path: toWorkspaceRelativePath(workspaceRoot, fileName) };
  }
}

export function languageIdFromPath(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".ts" || extension === ".tsx") return "typescript";
  if (extension === ".js" || extension === ".jsx") return "javascript";
  if (extension === ".json") return "json";
  return "plaintext";
}
