export interface RagTextChunk {
  readonly content: string;
  readonly endLine: number;
  readonly path: string;
  readonly preview: string;
  readonly startLine: number;
  readonly symbols: readonly string[];
}

export interface RagTextChunkInput {
  readonly content: string;
  readonly maxLines?: number;
  readonly path: string;
}

const DEFAULT_MAX_LINES = 80;
const SYMBOL_PATTERN = /\b(?:class|function|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_SYMBOL_PATTERN = /\bexport\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;

export function chunkTextFile(input: RagTextChunkInput): readonly RagTextChunk[] {
  const lines = splitLines(input.content);
  const maxLines = input.maxLines ?? DEFAULT_MAX_LINES;
  const chunks: RagTextChunk[] = [];

  for (let start = 0; start < lines.length; start += maxLines) {
    const end = Math.min(start + maxLines, lines.length);
    const content = lines.slice(start, end).join("\n");
    chunks.push(toChunk(input.path, content, start + 1, end));
  }

  return chunks;
}

function splitLines(content: string): readonly string[] {
  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === "") return lines.slice(0, -1);
  return lines;
}

function toChunk(path: string, content: string, startLine: number, endLine: number): RagTextChunk {
  return {
    content,
    endLine,
    path,
    preview: firstNonEmptyLine(content),
    startLine,
    symbols: extractSymbols(content)
  };
}

function firstNonEmptyLine(content: string): string {
  return content.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

function extractSymbols(content: string): readonly string[] {
  const symbols = [
    ...matchSymbols(content, EXPORT_SYMBOL_PATTERN),
    ...matchSymbols(content, SYMBOL_PATTERN)
  ];

  return [...new Set(symbols)];
}

function matchSymbols(content: string, pattern: RegExp): readonly string[] {
  return [...content.matchAll(pattern)].map((match) => match[1]).filter(isString);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
