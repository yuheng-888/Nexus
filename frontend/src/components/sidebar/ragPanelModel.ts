import type { RagIndexStatus, RagSearchResult } from "../../types/rag";

const SCORE_DIGITS = 3;

export type RagPanelStatus = RagIndexStatus;

export function ragStatusText(status: RagPanelStatus | null): string {
  if (status === null) return "索引状态加载中";
  if (status.workspaceRoot === null) return "尚未打开项目";
  if (!status.indexed) return "未构建索引";

  return `已索引 ${status.indexedFiles} 个文件 · ${status.indexedChunks} 个片段`;
}

export function formatRagBuiltAt(builtAt: number | undefined): string {
  if (builtAt === undefined) return "尚未构建";

  return new Date(builtAt).toLocaleString();
}

export function formatRagResultLocation(result: Pick<RagSearchResult, "endLine" | "path" | "startLine">): string {
  if (result.startLine === result.endLine) return `${result.path}:${result.startLine}`;

  return `${result.path}:${result.startLine}-${result.endLine}`;
}

export function summarizeRagResult(result: Pick<RagSearchResult, "preview" | "score">): string {
  const preview = result.preview.replace(/\s+/g, " ").trim();

  return `${preview} · score ${result.score.toFixed(SCORE_DIGITS)}`;
}

export function ragErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `RAG 操作失败: ${message}`;
}
