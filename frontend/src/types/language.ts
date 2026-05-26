export type LanguageDiagnosticSeverity = "error" | "hint" | "information" | "warning";

export interface LanguagePosition {
  readonly character: number;
  readonly line: number;
}

export interface LanguageRange {
  readonly end: LanguagePosition;
  readonly start: LanguagePosition;
}

export interface LanguageLocation {
  readonly path: string;
  readonly range: LanguageRange;
}

export interface LanguageDocumentInput {
  readonly content: string;
  readonly languageId?: string;
  readonly path: string;
}

export interface LanguagePathRequest {
  readonly path: string;
}

export interface LanguagePositionRequest extends LanguagePathRequest {
  readonly position: LanguagePosition;
}

export interface LanguageDiagnostic {
  readonly code?: string | number;
  readonly message: string;
  readonly range: LanguageRange;
  readonly severity: LanguageDiagnosticSeverity;
  readonly source: string;
}

export interface LanguageCompletionItem {
  readonly detail?: string;
  readonly kind: string;
  readonly label: string;
  readonly sortText?: string;
}

export interface LanguageCompletionList {
  readonly isIncomplete: boolean;
  readonly items: readonly LanguageCompletionItem[];
}

export interface LanguageHover {
  readonly contents: string;
  readonly range?: LanguageRange;
}

export interface LanguageDocumentSymbol {
  readonly children?: readonly LanguageDocumentSymbol[];
  readonly kind: string;
  readonly name: string;
  readonly range: LanguageRange;
  readonly selectionRange: LanguageRange;
}

export interface LanguageApi {
  completions(request: LanguagePositionRequest): Promise<LanguageCompletionList>;
  definition(request: LanguagePositionRequest): Promise<readonly LanguageLocation[]>;
  diagnostics(request: LanguagePathRequest): Promise<readonly LanguageDiagnostic[]>;
  documentSymbols(request: LanguagePathRequest): Promise<readonly LanguageDocumentSymbol[]>;
  hover(request: LanguagePositionRequest): Promise<LanguageHover | null>;
  openDocument(input: LanguageDocumentInput): Promise<void>;
  references(request: LanguagePositionRequest): Promise<readonly LanguageLocation[]>;
  updateDocument(input: LanguageDocumentInput): Promise<void>;
}
