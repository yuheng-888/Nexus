import { readFile } from "node:fs/promises";
import type {
  RagContextBundle,
  RagIndexStatus,
  RagIndexSummary,
  RagSearchRequest,
  RagSearchResult,
  RagSkippedFile
} from "../ragContracts.js";
import { chunkTextFile } from "./ragChunker.js";
import { walkRagFiles, type RagWalkFile } from "./ragFileWalker.js";
import { createStoredIndex, RagIndexStore, type StoredRagChunk, type StoredRagIndex } from "./ragIndexStore.js";
import { buildContextBundle, searchRagIndex } from "./ragSearchService.js";
import { tokenizeForRag } from "./ragTokenizer.js";

export interface RagServiceOptions {
  readonly indexRoot?: string;
  readonly workspaceRoot: string | null;
}

export class RagService {
  private readonly indexRoot: string | undefined;
  private workspaceRoot: string | null;

  constructor(options: RagServiceOptions) {
    this.indexRoot = options.indexRoot;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async buildIndex(): Promise<RagIndexSummary> {
    const workspaceRoot = this.requireWorkspaceRoot();
    const walked = await walkRagFiles({ workspaceRoot });
    const built = await this.readChunks(walked.files, walked.skippedFiles);
    const index = createStoredIndex({
      builtAt: Date.now(),
      chunks: built.chunks,
      files: walked.files.map(toStoredFile),
      skippedFiles: built.skippedFiles,
      workspaceRoot
    });
    await this.storeFor(workspaceRoot).save(index);

    return this.toSummary(index);
  }

  async clear(): Promise<RagIndexStatus> {
    const workspaceRoot = this.requireWorkspaceRoot();
    await this.storeFor(workspaceRoot).clear();
    return this.status();
  }

  async context(request: RagSearchRequest): Promise<RagContextBundle> {
    return buildContextBundle(await this.requireIndex(), request);
  }

  async search(request: RagSearchRequest): Promise<readonly RagSearchResult[]> {
    return searchRagIndex(await this.requireIndex(), request);
  }

  async status(): Promise<RagIndexStatus> {
    const workspaceRoot = this.workspaceRoot;
    if (workspaceRoot === null) return this.emptyStatus(null, "");
    const store = this.storeFor(workspaceRoot);
    const index = await store.load();
    if (index === null) return this.emptyStatus(workspaceRoot, store.indexPath);
    return this.toStatus(index);
  }

  private async readChunks(
    files: readonly RagWalkFile[],
    skippedFiles: readonly RagSkippedFile[]
  ): Promise<{ chunks: StoredRagChunk[]; skippedFiles: RagSkippedFile[] }> {
    const chunks: StoredRagChunk[] = [];
    const skipped = [...skippedFiles];

    for (const file of files) {
      await this.readFileChunks(file, chunks, skipped);
    }

    return { chunks, skippedFiles: skipped };
  }

  private async readFileChunks(
    file: RagWalkFile,
    chunks: StoredRagChunk[],
    skippedFiles: RagSkippedFile[]
  ): Promise<void> {
    try {
      const content = await readFile(file.absolutePath, "utf8");
      chunks.push(...chunkTextFile({ content, path: file.path }).map(toStoredChunk));
    } catch (error) {
      skippedFiles.push({ message: error instanceof Error ? error.message : String(error), path: file.path });
    }
  }

  private async requireIndex(): Promise<StoredRagIndex> {
    const workspaceRoot = this.requireWorkspaceRoot();
    const index = await this.storeFor(workspaceRoot).load();
    if (index === null) throw new Error("Code index is missing. Build the local RAG index before retrieval.");
    return index;
  }

  private requireWorkspaceRoot(): string {
    if (this.workspaceRoot === null) throw new Error("No workspace is open");
    return this.workspaceRoot;
  }

  private storeFor(workspaceRoot: string): RagIndexStore {
    return new RagIndexStore({ indexRoot: this.indexRoot, workspaceRoot });
  }

  private toSummary(index: StoredRagIndex): RagIndexSummary {
    return {
      builtAt: index.builtAt,
      indexed: true,
      indexedChunks: index.chunks.length,
      indexedFiles: index.files.length,
      indexPath: this.storeFor(index.workspaceRoot).indexPath,
      skippedFiles: index.skippedFiles,
      workspaceRoot: index.workspaceRoot
    };
  }

  private toStatus(index: StoredRagIndex): RagIndexStatus {
    return {
      builtAt: index.builtAt,
      indexed: true,
      indexedChunks: index.chunks.length,
      indexedFiles: index.files.length,
      indexPath: this.storeFor(index.workspaceRoot).indexPath,
      workspaceRoot: index.workspaceRoot
    };
  }

  private emptyStatus(workspaceRoot: string | null, indexPath: string): RagIndexStatus {
    return { indexed: false, indexedChunks: 0, indexedFiles: 0, indexPath, workspaceRoot };
  }
}

function toStoredFile(file: RagWalkFile): { mtimeMs: number; path: string; size: number } {
  return { mtimeMs: file.mtimeMs, path: file.path, size: file.size };
}

function toStoredChunk(chunk: {
  readonly content: string;
  readonly endLine: number;
  readonly path: string;
  readonly preview: string;
  readonly startLine: number;
  readonly symbols: readonly string[];
}): StoredRagChunk {
  return {
    ...chunk,
    id: `${chunk.path}:${chunk.startLine}-${chunk.endLine}`,
    tokens: tokenizeForRag(`${chunk.path}\n${chunk.symbols.join("\n")}\n${chunk.content}`)
  };
}
