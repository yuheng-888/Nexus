import type {
  LanguageDiagnostic,
  LanguageDocumentSymbol,
  LanguageHover,
  LanguageLocation,
  LanguagePathRequest,
  LanguagePositionRequest,
  LanguageRange
} from "../languageContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readRequiredNumber, readRequiredString } from "./agentToolArgs.js";
import type { LanguageService } from "./languageService.js";

export interface AgentLanguageToolProvider {
  definition(args: Record<string, unknown>): Promise<string>;
  diagnostics(args: Record<string, unknown>): Promise<string>;
  documentSymbols(args: Record<string, unknown>): Promise<string>;
  hover(args: Record<string, unknown>): Promise<string>;
  references(args: Record<string, unknown>): Promise<string>;
}

export class NativeAgentLanguageToolProvider implements AgentLanguageToolProvider {
  private readonly service: LanguageService;

  constructor(options: { readonly service: LanguageService }) {
    this.service = options.service;
  }

  async definition(args: Record<string, unknown>): Promise<string> {
    return formatLocations(await this.service.definition(readPositionRequest(args)), "No definitions.");
  }

  async diagnostics(args: Record<string, unknown>): Promise<string> {
    return formatDiagnostics(readPathRequest(args).path, await this.service.diagnostics(readPathRequest(args)));
  }

  async documentSymbols(args: Record<string, unknown>): Promise<string> {
    return formatSymbols(await this.service.documentSymbols(readPathRequest(args)));
  }

  async hover(args: Record<string, unknown>): Promise<string> {
    return formatHover(await this.service.hover(readPositionRequest(args)));
  }

  async references(args: Record<string, unknown>): Promise<string> {
    return formatLocations(await this.service.references(readPositionRequest(args)), "No references.");
  }
}

export function createLanguageToolSpecs(provider: AgentLanguageToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    readSpec(provider, {
      description: "Read TypeScript diagnostics for a workspace file.",
      method: "diagnostics",
      name: "languages.diagnostics",
      parameters: "path: string"
    }),
    readSpec(provider, {
      description: "Read document symbols for a workspace file.",
      method: "documentSymbols",
      name: "languages.document_symbols",
      parameters: "path: string"
    }),
    readSpec(provider, {
      description: "Find definitions at a 1-based file position.",
      method: "definition",
      name: "languages.definition",
      parameters: "path: string, line: number, character: number"
    }),
    readSpec(provider, {
      description: "Find references at a 1-based file position.",
      method: "references",
      name: "languages.references",
      parameters: "path: string, line: number, character: number"
    }),
    readSpec(provider, {
      description: "Read hover information at a 1-based file position.",
      method: "hover",
      name: "languages.hover",
      parameters: "path: string, line: number, character: number"
    })
  ];
}

interface LanguageToolSpecConfig {
  readonly description: string;
  readonly method: keyof AgentLanguageToolProvider;
  readonly name: string;
  readonly parameters: string;
}

function readSpec(provider: AgentLanguageToolProvider | undefined, config: LanguageToolSpecConfig): AgentInteractiveToolSpec {
  return {
    description: config.description,
    name: config.name,
    parameters: config.parameters,
    permission: "read",
    run: (args) => requireProvider(provider)[config.method](args)
  };
}

function readPathRequest(args: Record<string, unknown>): LanguagePathRequest {
  return { path: readRequiredString(args, "path") };
}

function readPositionRequest(args: Record<string, unknown>): LanguagePositionRequest {
  return {
    path: readRequiredString(args, "path"),
    position: {
      character: readRequiredNumber(args, "character"),
      line: readRequiredNumber(args, "line")
    }
  };
}

function formatDiagnostics(path: string, diagnostics: readonly LanguageDiagnostic[]): string {
  if (diagnostics.length === 0) return "No diagnostics.";
  return diagnostics.map((diagnostic) => formatDiagnostic(path, diagnostic)).join("\n");
}

function formatDiagnostic(path: string, diagnostic: LanguageDiagnostic): string {
  const code = diagnostic.code === undefined ? "" : ` ${diagnostic.code}`;
  return `${diagnostic.severity} ${path}:${formatPosition(diagnostic.range.start)} ${diagnostic.source}${code}: ${diagnostic.message}`;
}

function formatHover(hover: LanguageHover | null): string {
  if (hover === null) return "No hover information.";
  return hover.range === undefined ? hover.contents : `${formatRange(hover.range)}\n${hover.contents}`;
}

function formatLocations(locations: readonly LanguageLocation[], empty: string): string {
  if (locations.length === 0) return empty;
  return locations.map((location) => `${location.path}:${formatRange(location.range)}`).join("\n");
}

function formatSymbols(symbols: readonly LanguageDocumentSymbol[]): string {
  if (symbols.length === 0) return "No document symbols.";
  return symbols.flatMap((symbol) => formatSymbol(symbol, 0)).join("\n");
}

function formatSymbol(symbol: LanguageDocumentSymbol, depth: number): readonly string[] {
  const current = `${"  ".repeat(depth)}${symbol.kind} ${symbol.name} ${formatRange(symbol.range)}`;
  const children = symbol.children?.flatMap((child) => formatSymbol(child, depth + 1)) ?? [];
  return [current, ...children];
}

function formatRange(range: LanguageRange): string {
  return `${formatPosition(range.start)}-${formatPosition(range.end)}`;
}

function formatPosition(position: { readonly character: number; readonly line: number }): string {
  return `${position.line}:${position.character}`;
}

function requireProvider(provider: AgentLanguageToolProvider | undefined): AgentLanguageToolProvider {
  if (provider === undefined) throw new Error("Language tools are not configured.");
  return provider;
}
