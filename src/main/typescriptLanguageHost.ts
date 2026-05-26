import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import ts from "typescript";
import { LanguageDocumentStore, type LanguageDocumentSnapshot } from "./languageDocumentStore.js";

export class TypeScriptLanguageHost {
  private readonly documents: LanguageDocumentStore;

  constructor(documents: LanguageDocumentStore) {
    this.documents = documents;
  }

  create(): ts.LanguageService {
    const servicesHost = this.createServicesHost();
    return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
  }

  private createServicesHost(): ts.LanguageServiceHost {
    const documents = this.documents;

    return {
      directoryExists: (directoryName) => existsSync(directoryName),
      fileExists: (fileName) => fileExists(fileName, documents),
      getCompilationSettings: () => defaultCompilerOptions(),
      getCurrentDirectory: () => documents.requireWorkspaceRoot(),
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      getDirectories: ts.sys.getDirectories,
      getScriptFileNames: () => getScriptFileNames(documents),
      getScriptSnapshot: (fileName) => getScriptSnapshot(fileName, documents),
      getScriptVersion: (fileName) => getScriptVersion(fileName, documents),
      readDirectory: ts.sys.readDirectory,
      readFile: (fileName) => readHostFile(fileName, documents)
    };
  }
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022
  };
}

function getScriptFileNames(documents: LanguageDocumentStore): string[] {
  return unique([...discoverWorkspaceScripts(documents.requireWorkspaceRoot()), ...documents.getOpenFileNames()]);
}

function discoverWorkspaceScripts(workspaceRoot: string): readonly string[] {
  const configPath = ts.findConfigFile(workspaceRoot, ts.sys.fileExists, "tsconfig.json");
  if (configPath === undefined) return [];
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) return [];

  return ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath)).fileNames;
}

function getScriptSnapshot(fileName: string, documents: LanguageDocumentStore): ts.IScriptSnapshot | undefined {
  const content = readHostFile(fileName, documents);
  return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
}

function getScriptVersion(fileName: string, documents: LanguageDocumentStore): string {
  return String(readOpenDocumentVersion(fileName, documents) ?? getFileVersion(fileName));
}

function readHostFile(fileName: string, documents: LanguageDocumentStore): string | undefined {
  return readOpenDocument(fileName, documents)?.content ?? readDiskFile(fileName);
}

function fileExists(fileName: string, documents: LanguageDocumentStore): boolean {
  return readOpenDocument(fileName, documents) !== undefined || ts.sys.fileExists(fileName);
}

function readOpenDocument(fileName: string, documents: LanguageDocumentStore): { content: string } | undefined {
  return readCachedDocument(fileName, documents, (document) => ({ content: document.content }));
}

function readOpenDocumentVersion(fileName: string, documents: LanguageDocumentStore): number | undefined {
  return readCachedDocument(fileName, documents, (document) => document.version);
}

function readCachedDocument<T>(
  fileName: string,
  documents: LanguageDocumentStore,
  map: (document: LanguageDocumentSnapshot) => T
): T | undefined {
  const document = documents.getOpenByFileName(fileName);
  return document === undefined ? undefined : map(document);
}

function readDiskFile(fileName: string): string | undefined {
  try {
    return readFileSync(fileName, "utf8");
  } catch {
    return undefined;
  }
}

function getFileVersion(fileName: string): number {
  try {
    return Math.floor(statSync(fileName).mtimeMs);
  } catch {
    return 0;
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((fileName) => isSupportedScript(fileName)))];
}

function isSupportedScript(fileName: string): boolean {
  return /\.(c|m)?[jt]sx?$/.test(basename(fileName));
}
