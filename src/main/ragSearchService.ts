import type { RagContextBundle, RagSearchRequest, RagSearchResult } from "../ragContracts.js";
import { tokenizeForRag } from "./ragTokenizer.js";
import type { StoredRagChunk, StoredRagIndex } from "./ragIndexStore.js";

const DEFAULT_LIMIT = 8;
const CONTENT_TOKEN_WEIGHT = 2;
const PATH_TOKEN_WEIGHT = 3;
const PHRASE_WEIGHT = 5;
const SYMBOL_TOKEN_WEIGHT = 4;

export function searchRagIndex(
  index: StoredRagIndex,
  request: RagSearchRequest
): readonly RagSearchResult[] {
  const query = request.query.trim();
  if (query === "") return [];
  const queryTokens = tokenizeForRag(query);
  if (queryTokens.length === 0) return [];

  return index.chunks
    .map((chunk) => toScoredResult(chunk, query, queryTokens))
    .filter((result) => result.score > 0)
    .sort(compareResults)
    .slice(0, request.limit ?? DEFAULT_LIMIT);
}

export function buildContextBundle(
  index: StoredRagIndex,
  request: RagSearchRequest
): RagContextBundle {
  return {
    generatedAt: Date.now(),
    query: request.query,
    results: searchRagIndex(index, request)
  };
}

function toScoredResult(
  chunk: StoredRagChunk,
  query: string,
  queryTokens: readonly string[]
): RagSearchResult {
  return {
    content: chunk.content,
    endLine: chunk.endLine,
    path: chunk.path,
    preview: chunk.preview,
    score: scoreChunk(chunk, query, queryTokens),
    startLine: chunk.startLine,
    symbols: chunk.symbols
  };
}

function scoreChunk(chunk: StoredRagChunk, query: string, queryTokens: readonly string[]): number {
  const contentTokens = new Set(chunk.tokens);
  const symbolText = chunk.symbols.join(" ").toLowerCase();
  const pathText = chunk.path.toLowerCase();
  let score = chunk.content.toLowerCase().includes(query.toLowerCase()) ? PHRASE_WEIGHT : 0;

  for (const token of queryTokens) {
    if (contentTokens.has(token)) score += CONTENT_TOKEN_WEIGHT;
    if (pathText.includes(token)) score += PATH_TOKEN_WEIGHT;
    if (symbolText.includes(token)) score += SYMBOL_TOKEN_WEIGHT;
  }

  return score;
}

function compareResults(left: RagSearchResult, right: RagSearchResult): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.path.localeCompare(right.path) || left.startLine - right.startLine;
}
