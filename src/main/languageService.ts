import ts from "typescript";
import type {
  LanguageCompletionList,
  LanguageDiagnostic,
  LanguageDocumentInput,
  LanguageDocumentSymbol,
  LanguageHover,
  LanguageLocation,
  LanguagePathRequest,
  LanguagePosition,
  LanguagePositionRequest
} from "../languageContracts.js";
import { LanguageDocumentStore } from "./languageDocumentStore.js";
import {
  toCompletionItem,
  toDiagnostic,
  toDocumentSymbol,
  toLocation,
  toRange
} from "./languageServiceMappers.js";
import { TypeScriptLanguageHost } from "./typescriptLanguageHost.js";

export interface LanguageServiceOptions {
  readonly workspaceRoot: string | null;
}

export class LanguageService {
  private readonly documents: LanguageDocumentStore;
  private service: ts.LanguageService | undefined;

  constructor(options: LanguageServiceOptions) {
    this.documents = new LanguageDocumentStore(options.workspaceRoot);
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.documents.setWorkspaceRoot(workspaceRoot);
    this.service?.dispose();
    this.service = undefined;
  }

  async openDocument(input: LanguageDocumentInput): Promise<void> {
    this.documents.open(input);
  }

  async updateDocument(input: LanguageDocumentInput): Promise<void> {
    this.documents.open(input);
  }

  async diagnostics(request: LanguagePathRequest): Promise<readonly LanguageDiagnostic[]> {
    const document = await this.documents.get(request.path);
    const sourceFile = toSourceFile(document.fileName, document.content);
    const diagnostics = [
      ...this.ts().getSyntacticDiagnostics(document.fileName),
      ...this.ts().getSemanticDiagnostics(document.fileName)
    ];

    return diagnostics.map((diagnostic) => toDiagnostic(diagnostic, sourceFile));
  }

  async completions(request: LanguagePositionRequest): Promise<LanguageCompletionList> {
    const data = await this.positionData(request);
    const completions = this.ts().getCompletionsAtPosition(data.fileName, data.offset, {});

    return {
      isIncomplete: false,
      items: completions?.entries.map(toCompletionItem) ?? []
    };
  }

  async hover(request: LanguagePositionRequest): Promise<LanguageHover | null> {
    const data = await this.positionData(request);
    const info = this.ts().getQuickInfoAtPosition(data.fileName, data.offset);
    if (info === undefined) return null;

    return {
      contents: ts.displayPartsToString(info.displayParts ?? []),
      range: toRange(data.sourceFile, info.textSpan.start, info.textSpan.length)
    };
  }

  async definition(request: LanguagePositionRequest): Promise<readonly LanguageLocation[]> {
    const data = await this.positionData(request);
    const definitions = this.ts().getDefinitionAtPosition(data.fileName, data.offset) ?? [];
    return definitions.map((definition) => toLocation(this.documents, definition.fileName, definition.textSpan)).filter(isPresent);
  }

  async references(request: LanguagePositionRequest): Promise<readonly LanguageLocation[]> {
    const data = await this.positionData(request);
    const references = this.ts().getReferencesAtPosition(data.fileName, data.offset) ?? [];
    return references.map((reference) => toLocation(this.documents, reference.fileName, reference.textSpan)).filter(isPresent);
  }

  async documentSymbols(request: LanguagePathRequest): Promise<readonly LanguageDocumentSymbol[]> {
    const document = await this.documents.get(request.path);
    const sourceFile = toSourceFile(document.fileName, document.content);
    const tree = this.ts().getNavigationTree(document.fileName);
    return tree.childItems?.map((item) => toDocumentSymbol(item, sourceFile)).filter(isPresent) ?? [];
  }

  private async positionData(request: LanguagePositionRequest): Promise<PositionData> {
    const document = await this.documents.get(request.path);
    const sourceFile = toSourceFile(document.fileName, document.content);
    return { fileName: document.fileName, offset: toOffset(sourceFile, request.position), sourceFile };
  }

  private ts(): ts.LanguageService {
    this.documents.requireWorkspaceRoot();
    this.service ??= new TypeScriptLanguageHost(this.documents).create();
    return this.service;
  }
}

interface PositionData {
  readonly fileName: string;
  readonly offset: number;
  readonly sourceFile: ts.SourceFile;
}

function toOffset(sourceFile: ts.SourceFile, position: LanguagePosition): number {
  return ts.getPositionOfLineAndCharacter(sourceFile, position.line - 1, position.character - 1);
}

function toSourceFile(fileName: string, content: string): ts.SourceFile {
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
