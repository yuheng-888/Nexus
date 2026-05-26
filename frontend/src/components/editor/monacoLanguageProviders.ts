import type { Monaco } from "@monaco-editor/react";
import type { editor, IDisposable, IRange, languages, Position } from "monaco-editor";
import type { LanguageLocation, LanguageRange } from "../../types/language";
import {
  completionItemKind,
  languageLocationToUri,
  languageRangeToMonaco,
  modelUriToPath,
  monacoPositionToLanguage,
  symbolKind
} from "./languageClient";

let registered = false;

export function registerNexusLanguageProviders(monaco: Monaco): void {
  if (registered) return;
  registered = true;
  disableBuiltInDiagnostics(monaco);
  registerProvidersFor(monaco, "typescript");
  registerProvidersFor(monaco, "javascript");
}

function disableBuiltInDiagnostics(monaco: Monaco): void {
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true
  });
}

function registerProvidersFor(monaco: Monaco, languageId: string): void {
  const disposables = [
    completionProvider(monaco, languageId),
    hoverProvider(monaco, languageId),
    definitionProvider(monaco, languageId),
    referenceProvider(monaco, languageId),
    symbolProvider(monaco, languageId)
  ];
  keepDisposables(disposables);
}

function completionProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: [".", "'", "\"", "/"],
    provideCompletionItems: async (model: editor.ITextModel, position: Position) => {
      const completions = await window.nexus.languages.completions({
        path: modelUriToPath(model.uri),
        position: monacoPositionToLanguage(position)
      });

      return {
        incomplete: completions.isIncomplete,
        suggestions: completions.items.map((item) => ({
          detail: item.detail,
          insertText: item.label,
          kind: completionItemKind(item),
          label: item.label,
          range: wordRange(model, position),
          sortText: item.sortText
        }))
      };
    }
  });
}

function hoverProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerHoverProvider(languageId, {
    provideHover: async (model: editor.ITextModel, position: Position) => {
      const hover = await window.nexus.languages.hover({
        path: modelUriToPath(model.uri),
        position: monacoPositionToLanguage(position)
      });
      if (hover === null) return null;

      return {
        contents: [{ value: `\`\`\`ts\n${hover.contents}\n\`\`\`` }],
        range: hover.range === undefined ? undefined : toRange(monaco, hover.range)
      };
    }
  });
}

function definitionProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerDefinitionProvider(languageId, {
    provideDefinition: async (model: editor.ITextModel, position: Position) => {
      const locations = await window.nexus.languages.definition({
        path: modelUriToPath(model.uri),
        position: monacoPositionToLanguage(position)
      });
      return locations.map((location) => toMonacoLocation(monaco, location));
    }
  });
}

function referenceProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerReferenceProvider(languageId, {
    provideReferences: async (model: editor.ITextModel, position: Position) => {
      const locations = await window.nexus.languages.references({
        path: modelUriToPath(model.uri),
        position: monacoPositionToLanguage(position)
      });
      return locations.map((location) => toMonacoLocation(monaco, location));
    }
  });
}

function symbolProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerDocumentSymbolProvider(languageId, {
    provideDocumentSymbols: async (model: editor.ITextModel) => {
      const symbols = await window.nexus.languages.documentSymbols({ path: modelUriToPath(model.uri) });
      return symbols.map((symbol) => ({
        children: [],
        containerName: "",
        kind: symbolKind(symbol),
        name: symbol.name,
        range: toRange(monaco, symbol.range),
        selectionRange: toRange(monaco, symbol.selectionRange),
        tags: []
      }));
    }
  });
}

function toMonacoLocation(monaco: Monaco, location: LanguageLocation): languages.Location {
  return {
    range: toRange(monaco, location.range),
    uri: monaco.Uri.parse(languageLocationToUri(location.path))
  };
}

function toRange(monaco: Monaco, range: LanguageRange): IRange {
  const mapped = languageRangeToMonaco(range);
  return new monaco.Range(
    mapped.startLineNumber,
    mapped.startColumn,
    mapped.endLineNumber,
    mapped.endColumn
  );
}

function wordRange(model: editor.ITextModel, position: Position): IRange {
  const word = model.getWordUntilPosition(position);
  return {
    endColumn: word.endColumn,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    startLineNumber: position.lineNumber
  };
}

function keepDisposables(_disposables: readonly IDisposable[]): void {
  // Providers live for the app lifetime once Monaco is initialized.
}
