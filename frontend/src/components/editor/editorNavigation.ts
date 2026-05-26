import type { LanguageDocumentSymbol } from "../../types/language";
import type { EditorProblem } from "./languageClient";

export interface EditorLocation {
  readonly column: number;
  readonly line: number;
  readonly path: string;
}

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

export interface FlatDocumentSymbol {
  readonly depth: number;
  readonly id: string;
  readonly symbol: LanguageDocumentSymbol;
}

export function problemToEditorLocation(problem: EditorProblem): EditorLocation {
  return {
    column: problem.range.start.character,
    line: problem.range.start.line,
    path: problem.path
  };
}

export function symbolToEditorLocation(path: string, symbol: LanguageDocumentSymbol): EditorLocation {
  return {
    column: symbol.selectionRange.start.character,
    line: symbol.selectionRange.start.line,
    path
  };
}

export function isAbsoluteEditorPath(path: string): boolean {
  return path.startsWith("/") || WINDOWS_ABSOLUTE_PATH_PATTERN.test(path);
}

export function flattenDocumentSymbols(symbols: readonly LanguageDocumentSymbol[]): readonly FlatDocumentSymbol[] {
  return symbols.flatMap((symbol, index) => flattenSymbol(symbol, [index], 0));
}

function flattenSymbol(
  symbol: LanguageDocumentSymbol,
  path: readonly number[],
  depth: number
): readonly FlatDocumentSymbol[] {
  const item = {
    depth,
    id: symbolId(symbol, path),
    symbol
  };
  const children = symbol.children ?? [];
  return [
    item,
    ...children.flatMap((child, index) => flattenSymbol(child, [...path, index], depth + 1))
  ];
}

function symbolId(symbol: LanguageDocumentSymbol, path: readonly number[]): string {
  return `${path.join(".")}:${symbol.name}:${symbol.selectionRange.start.line}:${symbol.selectionRange.start.character}`;
}
