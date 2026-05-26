import type { RagContextBundle, RagIndexStatus, RagIndexSummary, RagSearchRequest, RagSearchResult } from "../ragContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import type { RagContextProvider } from "./agentTools.js";
import { readLimit, readOptionalString, readRequiredString } from "./agentToolArgs.js";

const DEFAULT_RAG_LIMIT = 6;
const MAX_RAG_LIMIT = 12;

export interface AgentRagToolProvider extends RagContextProvider {
  buildIndex(): Promise<RagIndexSummary>;
  clear(): Promise<RagIndexStatus>;
  search(request: RagSearchRequest): Promise<readonly RagSearchResult[]>;
  status(): Promise<RagIndexStatus>;
}

export function createRagToolSpecs(provider: AgentRagToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    readTool(provider, "rag.index_status", "Read local RAG index status.", "none", indexStatus),
    readTool(provider, "rag.search", "Search the local RAG code index.", "query: string, limit?: number", searchIndex),
    readTool(provider, "rag.retrieve_context", "Retrieve local RAG snippets for a query.", "query?: string, limit?: number", retrieveContext),
    writeTool(provider, "rag.build_index", "Build the local RAG code index.", "none", buildIndex, "Build local RAG code index"),
    writeTool(provider, "rag.clear_index", "Clear the local RAG code index.", "none", clearIndex, "Clear local RAG code index")
  ];
}

function readTool(
  provider: AgentRagToolProvider | undefined,
  name: string,
  description: string,
  parameters: string,
  run: (provider: AgentRagToolProvider, args: Record<string, unknown>, context: { readonly prompt: string }) => Promise<string>
): AgentInteractiveToolSpec {
  return {
    description,
    name,
    parameters,
    permission: "read",
    run: (args, context) => run(requireProvider(provider), args, context)
  };
}

function writeTool(
  provider: AgentRagToolProvider | undefined,
  name: string,
  description: string,
  parameters: string,
  run: (provider: AgentRagToolProvider) => Promise<string>,
  previewText: string
): AgentInteractiveToolSpec {
  return {
    description,
    name,
    parameters,
    permission: "write",
    preview: async () => previewText,
    run: () => run(requireProvider(provider))
  };
}

async function indexStatus(provider: AgentRagToolProvider): Promise<string> {
  return formatStatus(await provider.status());
}

async function searchIndex(provider: AgentRagToolProvider, args: Record<string, unknown>): Promise<string> {
  const results = await provider.search({ limit: readLimit(args, DEFAULT_RAG_LIMIT, MAX_RAG_LIMIT), query: readRequiredString(args, "query") });
  return formatSearchResults(results);
}

async function retrieveContext(
  provider: AgentRagToolProvider,
  args: Record<string, unknown>,
  context: { readonly prompt: string }
): Promise<string> {
  const bundle = await provider.context({ limit: readLimit(args, DEFAULT_RAG_LIMIT, MAX_RAG_LIMIT), query: readOptionalString(args, "query") ?? context.prompt });
  return formatContextBundle(bundle);
}

async function buildIndex(provider: AgentRagToolProvider): Promise<string> {
  return formatSummary(await provider.buildIndex());
}

async function clearIndex(provider: AgentRagToolProvider): Promise<string> {
  return formatStatus(await provider.clear());
}

function formatSummary(summary: RagIndexSummary): string {
  return [
    "indexed: true",
    `workspaceRoot: ${summary.workspaceRoot}`,
    `indexPath: ${summary.indexPath}`,
    `indexedFiles: ${summary.indexedFiles}`,
    `indexedChunks: ${summary.indexedChunks}`,
    `builtAt: ${summary.builtAt}`,
    `skippedFiles: ${summary.skippedFiles.length}`,
    ...summary.skippedFiles.map((file) => `skipped ${file.path}: ${file.message}`)
  ].join("\n");
}

function formatStatus(status: RagIndexStatus): string {
  return [
    `indexed: ${status.indexed}`,
    `workspaceRoot: ${status.workspaceRoot ?? "<none>"}`,
    `indexPath: ${status.indexPath}`,
    `indexedFiles: ${status.indexedFiles}`,
    `indexedChunks: ${status.indexedChunks}`,
    status.builtAt === undefined ? "" : `builtAt: ${status.builtAt}`
  ].filter(Boolean).join("\n");
}

function formatContextBundle(bundle: RagContextBundle): string {
  if (bundle.results.length === 0) return "No local RAG results matched the query.";
  return bundle.results.map((result) => `${result.path}:${result.startLine}-${result.endLine}\n${result.content}`).join("\n\n");
}

function formatSearchResults(results: readonly RagSearchResult[]): string {
  if (results.length === 0) return "No local RAG results matched the query.";
  return results.map(formatSearchResult).join("\n\n");
}

function formatSearchResult(result: RagSearchResult): string {
  return [
    `${result.path}:${result.startLine}-${result.endLine} score=${result.score}`,
    result.symbols.length === 0 ? "" : `symbols: ${result.symbols.join(", ")}`,
    result.preview,
    result.content
  ].filter(Boolean).join("\n");
}

function requireProvider(provider: AgentRagToolProvider | undefined): AgentRagToolProvider {
  if (provider === undefined) throw new Error("Local RAG tools are not configured.");
  return provider;
}
