import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { RagSkippedFile } from "../ragContracts.js";

export interface StoredRagChunk {
  readonly content: string;
  readonly endLine: number;
  readonly id: string;
  readonly path: string;
  readonly preview: string;
  readonly startLine: number;
  readonly symbols: readonly string[];
  readonly tokens: readonly string[];
}

export interface StoredRagFile {
  readonly mtimeMs: number;
  readonly path: string;
  readonly size: number;
}

export interface StoredRagIndex {
  readonly builtAt: number;
  readonly chunks: readonly StoredRagChunk[];
  readonly files: readonly StoredRagFile[];
  readonly skippedFiles: readonly RagSkippedFile[];
  readonly version: number;
  readonly workspaceRoot: string;
}

export interface RagIndexStoreOptions {
  readonly indexRoot?: string;
  readonly workspaceRoot: string;
}

const INDEX_VERSION = 1;

export class RagIndexStore {
  readonly indexPath: string;

  constructor(options: RagIndexStoreOptions) {
    this.indexPath = join(options.indexRoot ?? defaultIndexRoot(), `${hashWorkspace(options.workspaceRoot)}.json`);
  }

  async clear(): Promise<void> {
    await rm(this.indexPath, { force: true });
  }

  async load(): Promise<StoredRagIndex | null> {
    if (!existsSync(this.indexPath)) return null;
    return parseIndex(await readFile(this.indexPath, "utf8"), this.indexPath);
  }

  async save(index: StoredRagIndex): Promise<void> {
    await mkdir(dirname(this.indexPath), { recursive: true });
    await writeFile(this.indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  }
}

export function createStoredIndex(input: Omit<StoredRagIndex, "version">): StoredRagIndex {
  return { ...input, version: INDEX_VERSION };
}

function defaultIndexRoot(): string {
  return join(homedir(), ".nexus", "code-indexes");
}

function hashWorkspace(workspaceRoot: string): string {
  return createHash("sha256").update(workspaceRoot).digest("hex").slice(0, 24);
}

function parseIndex(source: string, indexPath: string): StoredRagIndex {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (isStoredIndex(parsed)) return parsed;
  } catch (error) {
    throw new Error(`Code index is not valid JSON: ${indexPath}`, { cause: error });
  }

  throw new Error(`Code index has invalid shape: ${indexPath}`);
}

function isStoredIndex(value: unknown): value is StoredRagIndex {
  if (!isRecord(value)) return false;
  return value.version === INDEX_VERSION
    && typeof value.workspaceRoot === "string"
    && typeof value.builtAt === "number"
    && Array.isArray(value.files)
    && Array.isArray(value.chunks)
    && Array.isArray(value.skippedFiles);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
