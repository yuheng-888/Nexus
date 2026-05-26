import type {
  LanguageCompletionItem,
  LanguageDiagnostic,
  LanguageDiagnosticSeverity,
  LanguageDocumentSymbol,
  LanguageLocation,
  LanguageRange
} from "../../types/language";

export interface EditorProblem extends LanguageDiagnostic {
  readonly path: string;
}

export interface ProblemSummary {
  readonly errors: number;
  readonly hints: number;
  readonly information: number;
  readonly total: number;
  readonly warnings: number;
}

export interface MonacoMarkerData {
  readonly code?: string | number;
  readonly endColumn: number;
  readonly endLineNumber: number;
  readonly message: string;
  readonly severity: number;
  readonly source: string;
  readonly startColumn: number;
  readonly startLineNumber: number;
}

export interface MonacoPosition {
  readonly column: number;
  readonly lineNumber: number;
}

export interface MonacoRangeData {
  readonly endColumn: number;
  readonly endLineNumber: number;
  readonly startColumn: number;
  readonly startLineNumber: number;
}

const MARKER_SEVERITY: Record<LanguageDiagnosticSeverity, number> = {
  error: 8,
  hint: 1,
  information: 2,
  warning: 4
};

export function languageDiagnosticToMarker(diagnostic: LanguageDiagnostic): MonacoMarkerData {
  return {
    code: diagnostic.code,
    endColumn: diagnostic.range.end.character,
    endLineNumber: diagnostic.range.end.line,
    message: diagnostic.message,
    severity: MARKER_SEVERITY[diagnostic.severity],
    source: diagnostic.source,
    startColumn: diagnostic.range.start.character,
    startLineNumber: diagnostic.range.start.line
  };
}

export function diagnosticsToProblems(
  path: string,
  diagnostics: readonly LanguageDiagnostic[]
): readonly EditorProblem[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic, path })).sort(compareProblems);
}

export function monacoPositionToLanguage(position: MonacoPosition): { readonly character: number; readonly line: number } {
  return { character: position.column, line: position.lineNumber };
}

export function languageRangeToMonaco(range: LanguageRange): MonacoRangeData {
  return {
    endColumn: range.end.character,
    endLineNumber: range.end.line,
    startColumn: range.start.character,
    startLineNumber: range.start.line
  };
}

export function languageLocationToUri(path: string): string {
  return `file:///${path}`;
}

export function modelUriToPath(uri: { readonly path: string }): string {
  return uri.path.startsWith("/") ? uri.path.slice(1) : uri.path;
}

export function completionItemKind(item: LanguageCompletionItem): number {
  if (item.kind === "function" || item.kind === "method") return 1;
  if (item.kind === "class") return 7;
  if (item.kind === "interface") return 8;
  if (item.kind === "module") return 9;
  if (item.kind === "property") return 10;
  if (item.kind === "enum") return 12;
  if (item.kind === "keyword") return 13;
  if (item.kind === "variable" || item.kind === "const" || item.kind === "let") return 4;
  return 18;
}

export function symbolKind(symbol: LanguageDocumentSymbol): number {
  if (symbol.kind === "function" || symbol.kind === "method") return 11;
  if (symbol.kind === "class") return 4;
  if (symbol.kind === "interface") return 10;
  if (symbol.kind === "module") return 2;
  if (symbol.kind === "const" || symbol.kind === "let" || symbol.kind === "variable") return 12;
  return 13;
}

export function summarizeProblems(problems: readonly EditorProblem[]): ProblemSummary {
  return problems.reduce<ProblemSummary>((summary, problem) => ({
    errors: summary.errors + countSeverity(problem, "error"),
    hints: summary.hints + countSeverity(problem, "hint"),
    information: summary.information + countSeverity(problem, "information"),
    total: summary.total + 1,
    warnings: summary.warnings + countSeverity(problem, "warning")
  }), emptySummary());
}

export function compareProblems(left: EditorProblem, right: EditorProblem): number {
  return left.path.localeCompare(right.path)
    || left.range.start.line - right.range.start.line
    || left.range.start.character - right.range.start.character
    || severityRank(left.severity) - severityRank(right.severity);
}

function emptySummary(): ProblemSummary {
  return { errors: 0, hints: 0, information: 0, total: 0, warnings: 0 };
}

function countSeverity(problem: EditorProblem, severity: LanguageDiagnosticSeverity): number {
  return problem.severity === severity ? 1 : 0;
}

function severityRank(severity: LanguageDiagnosticSeverity): number {
  if (severity === "error") return 0;
  if (severity === "warning") return 1;
  if (severity === "information") return 2;
  return 3;
}
