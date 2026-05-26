import { readdir, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import type { RagSkippedFile } from "../ragContracts.js";

export interface RagWalkFile {
  readonly absolutePath: string;
  readonly mtimeMs: number;
  readonly path: string;
  readonly size: number;
}

export interface RagWalkResult {
  readonly files: readonly RagWalkFile[];
  readonly skippedFiles: readonly RagSkippedFile[];
}

export interface RagWalkOptions {
  readonly maxFileBytes?: number;
  readonly workspaceRoot: string;
}

const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".nexus",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "vendor"
]);
const SKIP_FILES = new Set([".env", ".env.local", ".env.production", "id_rsa"]);
const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".css",
  ".go",
  ".h",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".py",
  ".rs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".yaml",
  ".yml"
]);

export async function walkRagFiles(options: RagWalkOptions): Promise<RagWalkResult> {
  const files: RagWalkFile[] = [];
  const skippedFiles: RagSkippedFile[] = [];
  await walkDirectory(options.workspaceRoot, options.workspaceRoot, options, files, skippedFiles);

  return { files, skippedFiles };
}

async function walkDirectory(
  root: string,
  directory: string,
  options: RagWalkOptions,
  files: RagWalkFile[],
  skippedFiles: RagSkippedFile[]
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    await visitEntry({ directory, entry, files, options, root, skippedFiles });
  }
}

async function visitEntry(input: {
  readonly directory: string;
  readonly entry: { isDirectory(): boolean; isFile(): boolean; name: string };
  readonly files: RagWalkFile[];
  readonly options: RagWalkOptions;
  readonly root: string;
  readonly skippedFiles: RagSkippedFile[];
}): Promise<void> {
  if (input.entry.isDirectory()) {
    await visitDirectory(input);
    return;
  }

  if (input.entry.isFile()) {
    await visitFile(input);
  }
}

async function visitDirectory(input: {
  readonly directory: string;
  readonly entry: { name: string };
  readonly files: RagWalkFile[];
  readonly options: RagWalkOptions;
  readonly root: string;
  readonly skippedFiles: RagSkippedFile[];
}): Promise<void> {
  if (SKIP_DIRS.has(input.entry.name)) return;
  await walkDirectory(input.root, join(input.directory, input.entry.name), input.options, input.files, input.skippedFiles);
}

async function visitFile(input: {
  readonly directory: string;
  readonly entry: { name: string };
  readonly files: RagWalkFile[];
  readonly options: RagWalkOptions;
  readonly root: string;
  readonly skippedFiles: RagSkippedFile[];
}): Promise<void> {
  if (!isIndexableFile(input.entry.name)) return;
  const absolutePath = join(input.directory, input.entry.name);
  const metadata = await stat(absolutePath);
  const path = toRelativePath(input.root, absolutePath);

  if (metadata.size > (input.options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES)) {
    input.skippedFiles.push({ message: `File is larger than ${DEFAULT_MAX_FILE_BYTES} bytes`, path });
    return;
  }

  input.files.push({ absolutePath, mtimeMs: metadata.mtimeMs, path, size: metadata.size });
}

function isIndexableFile(name: string): boolean {
  if (SKIP_FILES.has(name)) return false;
  return TEXT_EXTENSIONS.has(extname(name).toLowerCase());
}

function toRelativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split(sep).join("/");
}
