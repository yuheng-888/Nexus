import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { DirectoryEntry, FileReadResult } from "../contracts.js";
import { resolveWorkspacePath, toWorkspaceRelativePath } from "./pathGuards.js";

const QUICK_OPEN_IGNORED_DIRECTORIES = new Set([
  ".git",
  "dist",
  "dist-packaged",
  "node_modules"
]);

export interface FileServiceOptions {
  readonly workspaceRoot: string | null;
}

export class FileService {
  private workspaceRoot: string | null;

  constructor(options: FileServiceOptions) {
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async listDirectory(directoryPath = "."): Promise<readonly DirectoryEntry[]> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const absoluteDirectory = resolveWorkspacePath(workspaceRoot, directoryPath);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    const mapped = entries.map((entry) => this.toDirectoryEntry(absoluteDirectory, entry));

    return mapped.sort(compareDirectoryEntries);
  }

  async findFiles(query = ""): Promise<readonly DirectoryEntry[]> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const normalizedQuery = query.trim().toLowerCase();
    const files = await this.findFileEntries(workspaceRoot);

    return files
      .filter((entry) => matchesQuery(entry, normalizedQuery))
      .sort(compareDirectoryEntries);
  }

  async readTextFile(filePath: string): Promise<FileReadResult> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const absolutePath = resolveWorkspacePath(workspaceRoot, filePath);
    const [content, metadata] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath)
    ]);

    return {
      absolutePath,
      content,
      mtimeMs: metadata.mtimeMs,
      path: toWorkspaceRelativePath(workspaceRoot, absolutePath)
    };
  }

  async readAbsoluteTextFile(filePath: string): Promise<FileReadResult> {
    if (!isAbsolute(filePath)) {
      throw new Error(`Absolute file read requires an absolute path: ${filePath}`);
    }

    const absolutePath = resolve(filePath);
    const [content, metadata] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath)
    ]);

    return {
      absolutePath,
      content,
      mtimeMs: metadata.mtimeMs,
      path: absolutePath
    };
  }

  async writeTextFile(filePath: string, content: string): Promise<FileReadResult> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const absolutePath = resolveWorkspacePath(workspaceRoot, filePath);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");

    return this.readTextFile(filePath);
  }

  async writeAbsoluteTextFile(filePath: string, content: string): Promise<FileReadResult> {
    if (!isAbsolute(filePath)) {
      throw new Error(`Absolute file write requires an absolute path: ${filePath}`);
    }

    const absolutePath = resolve(filePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
    return this.readAbsoluteTextFile(absolutePath);
  }

  private toDirectoryEntry(parentPath: string, entry: { isDirectory(): boolean; name: string }): DirectoryEntry {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const absolutePath = resolveWorkspacePath(parentPath, entry.name);

    return {
      absolutePath,
      isDirectory: entry.isDirectory(),
      name: entry.name,
      path: toWorkspaceRelativePath(workspaceRoot, absolutePath)
    };
  }

  private async findFileEntries(directoryPath: string): Promise<readonly DirectoryEntry[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => this.findEntry(directoryPath, entry)));

    return nested.flat();
  }

  private async findEntry(
    parentPath: string,
    entry: { isDirectory(): boolean; isFile(): boolean; name: string }
  ): Promise<readonly DirectoryEntry[]> {
    if (entry.isDirectory()) {
      if (QUICK_OPEN_IGNORED_DIRECTORIES.has(entry.name)) return [];

      return this.findFileEntries(resolveWorkspacePath(parentPath, entry.name));
    }

    return entry.isFile() ? [this.toDirectoryEntry(parentPath, entry)] : [];
  }
}

function compareDirectoryEntries(left: DirectoryEntry, right: DirectoryEntry): number {
  if (left.isDirectory !== right.isDirectory) {
    return left.isDirectory ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

function matchesQuery(entry: DirectoryEntry, query: string): boolean {
  if (query === "") return true;

  return entry.path.toLowerCase().includes(query);
}

function requireWorkspaceRoot(workspaceRoot: string | null): string {
  if (workspaceRoot === null) {
    throw new Error("No workspace is open");
  }

  return workspaceRoot;
}
