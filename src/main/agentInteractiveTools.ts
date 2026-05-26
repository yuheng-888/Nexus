import type { DirectoryEntry, SearchMatch } from "../contracts.js";
import type { GitCommandResult, GitDiffResult } from "../gitContracts.js";
import type { AgentToolCall } from "./agentToolProtocol.js";
import type { AgentToolResult, RagContextProvider } from "./agentTools.js";
import type { FileService } from "./fileService.js";
import type { GitService } from "./gitService.js";
import { resolveWorkspacePath } from "./pathGuards.js";
import {
  formatReverseAnalysis,
  formatReverseTargetDetection,
  type ReverseContextProvider
} from "./reverseAgentTools.js";
import type { SearchService } from "./searchService.js";

export interface AgentInteractiveToolContext {
  readonly cwd: string;
  readonly files: FileService;
  readonly git: GitService;
  readonly prompt: string;
  readonly search: SearchService;
  readonly workspaceRoot: string | null;
}

export interface AgentInteractiveToolDefinition {
  readonly description: string;
  readonly name: string;
  readonly parameters: string;
}

export interface AgentInteractiveToolRunner {
  listTools(): readonly AgentInteractiveToolDefinition[];
  runToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<AgentToolResult>;
}

export interface NativeAgentInteractiveToolRunnerOptions {
  readonly rag?: RagContextProvider;
  readonly reverse?: ReverseContextProvider;
}

interface ToolSpec extends AgentInteractiveToolDefinition {
  run(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string>;
}

const DEFAULT_RAG_LIMIT = 6;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_RAG_LIMIT = 12;
const MAX_SEARCH_LIMIT = 50;

export class NativeAgentInteractiveToolRunner implements AgentInteractiveToolRunner {
  private readonly tools: readonly ToolSpec[];

  constructor(options: NativeAgentInteractiveToolRunnerOptions = {}) {
    this.tools = buildTools(options);
  }

  listTools(): readonly AgentInteractiveToolDefinition[] {
    return this.tools.map(({ description, name, parameters }) => ({ description, name, parameters }));
  }

  async runToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<AgentToolResult> {
    const tool = this.tools.find((candidate) => candidate.name === call.name);
    if (tool === undefined) return failed(call.name, `Unknown Nexus tool: ${call.name}`);

    try {
      return { name: call.name, ok: true, output: await tool.run(call.arguments, context) };
    } catch (error) {
      return failed(call.name, error instanceof Error ? error.message : String(error));
    }
  }
}

export function formatInteractiveToolInstructions(
  tools: readonly AgentInteractiveToolDefinition[],
  maxToolRounds: number
): string {
  return [
    "Native interactive tools:",
    "When workspace data is needed, output one or more JSON tool calls, one object per line.",
    "Example: {\"type\":\"nexus.tool_call\",\"id\":\"read-main\",\"name\":\"workspace.read_file\",\"arguments\":{\"path\":\"src/main.ts\"}}",
    "Nexus will send tool results back as nexus.tool_result user messages. Do not invent tool results.",
    `If the model keeps requesting tools after ${maxToolRounds} rounds, Nexus stops with an explicit error.`,
    ...tools.map(formatToolDefinition)
  ].join("\n");
}

function buildTools(options: NativeAgentInteractiveToolRunnerOptions): readonly ToolSpec[] {
  return [
    tool("workspace.list_directory", "List files in a workspace directory.", "path?: string", listDirectory),
    tool("workspace.read_file", "Read a UTF-8 text file from the workspace.", "path: string", readFile),
    tool("workspace.search", "Search workspace text with ripgrep.", "query: string, cwd?: string, limit?: number", searchWorkspace),
    tool("git.status", "Read git status for the workspace.", "cwd?: string", readGitStatus),
    tool("git.diff", "Read git diff without modifying files.", "cwd?: string, path?: string, staged?: boolean", readGitDiff),
    tool("rag.retrieve_context", "Retrieve local RAG snippets for a query.", "query?: string, limit?: number", retrieveRagContext(options.rag)),
    tool("reverse.detect_target", "Detect reverse-engineering target metadata.", "path?: string", detectReverseTarget(options.reverse)),
    tool("reverse.scan_javascript", "Scan JS/TS files with reverse-engineering checks.", "path?: string", scanReverseJavaScript(options.reverse))
  ];
}

function tool(
  name: string,
  description: string,
  parameters: string,
  run: ToolSpec["run"]
): ToolSpec {
  return { description, name, parameters, run };
}

async function listDirectory(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const entries = await context.files.listDirectory(readOptionalString(args, "path") ?? context.cwd);
  return entries.map(formatDirectoryEntry).join("\n");
}

async function readFile(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const result = await context.files.readTextFile(readRequiredString(args, "path"));
  return [`${result.path} (${Math.round(result.mtimeMs)})`, result.content].join("\n");
}

async function searchWorkspace(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const matches = await context.search.search({
    cwd: readOptionalString(args, "cwd") ?? context.cwd,
    query: readRequiredString(args, "query")
  });
  return formatSearchMatches(matches, readLimit(args, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT));
}

async function readGitStatus(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.status(readOptionalString(args, "cwd") ?? context.cwd));
}

async function readGitDiff(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const result = await context.git.diff({
    cwd: readOptionalString(args, "cwd") ?? context.cwd,
    path: readOptionalString(args, "path"),
    staged: readOptionalBoolean(args, "staged")
  });
  return formatGitDiffResult(result);
}

function retrieveRagContext(provider: RagContextProvider | undefined): ToolSpec["run"] {
  return async (args, context) => {
    if (provider === undefined) throw new Error("Local RAG is not configured.");
    const limit = readLimit(args, DEFAULT_RAG_LIMIT, MAX_RAG_LIMIT);
    const bundle = await provider.context({ limit, query: readOptionalString(args, "query") ?? context.prompt });
    if (bundle.results.length === 0) return "No local RAG results matched the query.";
    return bundle.results.map((result) => `${result.path}:${result.startLine}-${result.endLine}\n${result.content}`).join("\n\n");
  };
}

function detectReverseTarget(provider: ReverseContextProvider | undefined): ToolSpec["run"] {
  return async (args, context) => {
    if (provider === undefined) throw new Error("Reverse tools are not configured.");
    return formatReverseTargetDetection(await provider.detectTarget(resolveToolPath(args, context)));
  };
}

function scanReverseJavaScript(provider: ReverseContextProvider | undefined): ToolSpec["run"] {
  return async (args, context) => {
    if (provider === undefined) throw new Error("Reverse tools are not configured.");
    return formatReverseAnalysis(await provider.scanJavaScript({ path: resolveToolPath(args, context) }));
  };
}

function resolveToolPath(args: Record<string, unknown>, context: AgentInteractiveToolContext): string {
  return resolveWorkspacePath(requireWorkspaceRoot(context), readOptionalString(args, "path") ?? context.cwd);
}

function formatDirectoryEntry(entry: DirectoryEntry): string {
  return `${entry.isDirectory ? "dir " : "file"} ${entry.path}`;
}

function formatSearchMatches(matches: readonly SearchMatch[], limit: number): string {
  if (matches.length === 0) return "No matches.";
  const shown = matches.slice(0, limit).map((match) => `${match.path}:${match.line}: ${match.preview}`);
  const omitted = matches.length > limit ? [`... ${matches.length - limit} more matches omitted by limit ${limit}.`] : [];
  return [...shown, ...omitted].join("\n");
}

function formatGitCommandResult(result: GitCommandResult): string {
  const stdout = result.stdout.trimEnd();
  const stderr = result.stderr.trimEnd();
  return [`exitCode=${result.exitCode}`, stdout === "" ? "stdout: <empty>" : `stdout:\n${stdout}`, stderr === "" ? "" : `stderr:\n${stderr}`].filter(Boolean).join("\n");
}

function formatGitDiffResult(result: GitDiffResult): string {
  return [`staged=${result.staged}`, result.path === undefined ? "" : `path=${result.path}`, formatGitCommandResult(result)].filter(Boolean).join("\n");
}

function readRequiredString(args: Record<string, unknown>, key: string): string {
  const value = readOptionalString(args, key);
  if (value === undefined) throw new Error(`Tool argument required: ${key}`);
  return value;
}

function readOptionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readOptionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

function readLimit(args: Record<string, unknown>, defaultLimit: number, maxLimit: number): number {
  const value = args.limit;
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultLimit;
  return Math.min(Math.max(Math.floor(value), 1), maxLimit);
}

function requireWorkspaceRoot(context: AgentInteractiveToolContext): string {
  if (context.workspaceRoot === null) throw new Error("No workspace is open");
  return context.workspaceRoot;
}

function failed(name: string, output: string): AgentToolResult {
  return { name, ok: false, output };
}

function formatToolDefinition(toolDefinition: AgentInteractiveToolDefinition): string {
  return `- ${toolDefinition.name}: ${toolDefinition.description} Arguments: ${toolDefinition.parameters}.`;
}
