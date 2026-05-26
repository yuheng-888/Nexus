import ts from "typescript";
import type {
  LanguageCompletionItem,
  LanguageDiagnostic,
  LanguageDiagnosticSeverity,
  LanguageDocumentSymbol,
  LanguageLocation,
  LanguageRange
} from "../languageContracts.js";
import { LanguageDocumentStore, type LanguageDocumentSnapshot } from "./languageDocumentStore.js";

export function toRange(sourceFile: ts.SourceFile, start: number, length: number): LanguageRange {
  return {
    end: toPosition(sourceFile, start + length),
    start: toPosition(sourceFile, start)
  };
}

export function toLocation(
  documents: LanguageDocumentStore,
  fileName: string,
  textSpan: ts.TextSpan
): LanguageLocation | null {
  const sourceFile = getLocationSourceFile(documents, fileName);
  if (sourceFile === null) return null;
  return { path: documents.toRelativePath(fileName), range: toRange(sourceFile, textSpan.start, textSpan.length) };
}

export function toDiagnostic(diagnostic: ts.Diagnostic, sourceFile: ts.SourceFile): LanguageDiagnostic {
  const start = diagnostic.start ?? 0;
  const length = diagnostic.length ?? 1;

  return {
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    range: toRange(sourceFile, start, length),
    severity: severityFromCategory(diagnostic.category),
    source: "typescript"
  };
}

export function toCompletionItem(entry: ts.CompletionEntry): LanguageCompletionItem {
  return {
    detail: entry.source,
    kind: entry.kind,
    label: entry.name,
    sortText: entry.sortText
  };
}

export function toDocumentSymbol(
  item: ts.NavigationTree,
  sourceFile: ts.SourceFile
): LanguageDocumentSymbol | null {
  const span = item.spans[0];
  if (span === undefined) return null;
  const children = item.childItems?.map((child) => toDocumentSymbol(child, sourceFile)).filter(isPresent);

  return {
    children: children?.length === 0 ? undefined : children,
    kind: item.kind,
    name: item.text,
    range: toRange(sourceFile, span.start, span.length),
    selectionRange: toRange(sourceFile, span.start, span.length)
  };
}

export function getSourceFile(fileName: string): ts.SourceFile | null {
  const content = ts.sys.readFile(fileName);
  return content === undefined ? null : ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
}

function getLocationSourceFile(documents: LanguageDocumentStore, fileName: string): ts.SourceFile | null {
  const open = documents.getOpenByFileName(fileName);
  return open === undefined ? getSourceFile(fileName) : toOpenSourceFile(open);
}

function toOpenSourceFile(document: LanguageDocumentSnapshot): ts.SourceFile {
  return ts.createSourceFile(document.fileName, document.content, ts.ScriptTarget.Latest, true);
}

function toPosition(sourceFile: ts.SourceFile, offset: number): { character: number; line: number } {
  const position = sourceFile.getLineAndCharacterOfPosition(offset);
  return { character: position.character + 1, line: position.line + 1 };
}

function severityFromCategory(category: ts.DiagnosticCategory): LanguageDiagnosticSeverity {
  if (category === ts.DiagnosticCategory.Error) return "error";
  if (category === ts.DiagnosticCategory.Warning) return "warning";
  if (category === ts.DiagnosticCategory.Suggestion) return "hint";
  return "information";
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
