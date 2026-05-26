export interface RagSkippedFile {
  readonly message: string;
  readonly path: string;
}

export interface RagIndexSummary {
  readonly builtAt: number;
  readonly indexed: true;
  readonly indexedChunks: number;
  readonly indexedFiles: number;
  readonly indexPath: string;
  readonly skippedFiles: readonly RagSkippedFile[];
  readonly workspaceRoot: string;
}

export interface RagIndexStatus {
  readonly builtAt?: number;
  readonly indexed: boolean;
  readonly indexedChunks: number;
  readonly indexedFiles: number;
  readonly indexPath: string;
  readonly workspaceRoot: string | null;
}

export interface RagSearchRequest {
  readonly limit?: number;
  readonly query: string;
}

export interface RagSearchResult {
  readonly content: string;
  readonly endLine: number;
  readonly path: string;
  readonly preview: string;
  readonly score: number;
  readonly startLine: number;
  readonly symbols: readonly string[];
}

export interface RagContextBundle {
  readonly generatedAt: number;
  readonly query: string;
  readonly results: readonly RagSearchResult[];
}
