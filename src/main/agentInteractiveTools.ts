import type { DirectoryEntry, SearchMatch } from "../contracts.js";
import { createGitToolSpecs } from "./agentGitTools.js";
import { createGitHubPublishToolSpecs, type AgentGitHubPublishToolProvider } from "./agentGitHubPublishTools.js";
import { createGitHubPullRequestToolSpecs, type AgentGitHubPullRequestToolProvider } from "./agentGitHubPullRequestTools.js";
import { createLanguageToolSpecs, type AgentLanguageToolProvider } from "./agentLanguageTools.js";
import { createMarketplaceToolSpecs, type AgentMarketplaceToolProvider } from "./agentMarketplaceTools.js";
import { createMcpToolSpecs, type AgentMcpToolProvider } from "./agentMcpTools.js";
import { createRagToolSpecs, type AgentRagToolProvider } from "./agentRagTools.js";
import { createScriptToolSpecs, type AgentScriptToolProvider } from "./agentScriptTools.js";
import { createSearchReplaceToolSpecs } from "./agentSearchReplaceTools.js";
import { createTestToolSpecs, type AgentTestToolProvider } from "./agentTestTools.js";
import type { AgentToolCall } from "./agentToolProtocol.js";
import type { AgentToolResult } from "./agentTools.js";
import { readLimit, readOptionalString, readRequiredString } from "./agentToolArgs.js";
import { createWorkflowToolSpecs, type AgentWorkflowToolProvider } from "./agentWorkflowTools.js";
import { createWritableToolSpecs } from "./agentWritableTools.js";
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
  readonly permission: AgentInteractiveToolPermission;
}

export interface AgentInteractiveToolRunner {
  getToolDefinition(name: string): AgentInteractiveToolDefinition | undefined;
  listTools(): readonly AgentInteractiveToolDefinition[];
  previewToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<string>;
  runToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<AgentToolResult>;
}

export interface NativeAgentInteractiveToolRunnerOptions {
  readonly gitHubPublish?: AgentGitHubPublishToolProvider;
  readonly gitHubPullRequests?: AgentGitHubPullRequestToolProvider;
  readonly languages?: AgentLanguageToolProvider;
  readonly marketplace?: AgentMarketplaceToolProvider;
  readonly mcp?: AgentMcpToolProvider;
  readonly rag?: AgentRagToolProvider;
  readonly reverse?: ReverseContextProvider;
  readonly scripts?: AgentScriptToolProvider;
  readonly tests?: AgentTestToolProvider;
  readonly workflows?: AgentWorkflowToolProvider;
}

export type AgentInteractiveToolPermission = "read" | "write";

export interface AgentInteractiveToolSpec extends AgentInteractiveToolDefinition {
  preview?: (args: Record<string, unknown>, context: AgentInteractiveToolContext) => Promise<string>;
  run(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string>;
}

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

export class NativeAgentInteractiveToolRunner implements AgentInteractiveToolRunner {
  private readonly tools: readonly AgentInteractiveToolSpec[];

  constructor(options: NativeAgentInteractiveToolRunnerOptions = {}) {
    this.tools = buildTools(options);
  }

  getToolDefinition(name: string): AgentInteractiveToolDefinition | undefined {
    const tool = this.findTool(name);
    return tool === undefined ? undefined : toDefinition(tool);
  }

  listTools(): readonly AgentInteractiveToolDefinition[] {
    return this.tools.map(toDefinition);
  }

  async previewToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<string> {
    const tool = this.findTool(call.name);
    if (tool?.preview === undefined) return `${call.name}\n${JSON.stringify(call.arguments, null, 2)}`;
    return tool.preview(call.arguments, context);
  }

  async runToolCall(call: AgentToolCall, context: AgentInteractiveToolContext): Promise<AgentToolResult> {
    const tool = this.findTool(call.name);
    if (tool === undefined) return failed(call.name, `Unknown Nexus tool: ${call.name}`);

    try {
      return { name: call.name, ok: true, output: await tool.run(call.arguments, context) };
    } catch (error) {
      return failed(call.name, error instanceof Error ? error.message : String(error));
    }
  }

  private findTool(name: string): AgentInteractiveToolSpec | undefined {
    return this.tools.find((candidate) => candidate.name === name);
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

function buildTools(options: NativeAgentInteractiveToolRunnerOptions): readonly AgentInteractiveToolSpec[] {
  return [
    readTool("workspace.list_directory", "List files in a workspace directory.", "path?: string", listDirectory),
    readTool("workspace.read_file", "Read a UTF-8 text file from the workspace.", "path: string", readFile),
    readTool("workspace.search", "Search workspace text with ripgrep.", "query: string, cwd?: string, limit?: number", searchWorkspace),
    ...createSearchReplaceToolSpecs(),
    ...createGitToolSpecs(),
    ...createRagToolSpecs(options.rag),
    readTool("reverse.detect_target", "Detect reverse-engineering target metadata.", "path?: string", detectReverseTarget(options.reverse)),
    readTool("reverse.scan_javascript", "Scan JS/TS files with reverse-engineering checks.", "path?: string", scanReverseJavaScript(options.reverse)),
    ...createLanguageToolSpecs(options.languages),
    ...createScriptToolSpecs(options.scripts),
    ...createTestToolSpecs(options.tests),
    ...createWorkflowToolSpecs(options.workflows),
    ...createGitHubPublishToolSpecs(options.gitHubPublish),
    ...createGitHubPullRequestToolSpecs(options.gitHubPullRequests),
    ...createMarketplaceToolSpecs(options.marketplace),
    ...createMcpToolSpecs(options.mcp),
    ...createWritableToolSpecs()
  ];
}

function readTool(
  name: string,
  description: string,
  parameters: string,
  run: AgentInteractiveToolSpec["run"]
): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "read", run };
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

function detectReverseTarget(provider: ReverseContextProvider | undefined): AgentInteractiveToolSpec["run"] {
  return async (args, context) => {
    if (provider === undefined) throw new Error("Reverse tools are not configured.");
    return formatReverseTargetDetection(await provider.detectTarget(resolveToolPath(args, context)));
  };
}

function scanReverseJavaScript(provider: ReverseContextProvider | undefined): AgentInteractiveToolSpec["run"] {
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

function requireWorkspaceRoot(context: AgentInteractiveToolContext): string {
  if (context.workspaceRoot === null) throw new Error("No workspace is open");
  return context.workspaceRoot;
}

function failed(name: string, output: string): AgentToolResult {
  return { name, ok: false, output };
}

function formatToolDefinition(toolDefinition: AgentInteractiveToolDefinition): string {
  return `- ${toolDefinition.name} (${toolDefinition.permission}): ${toolDefinition.description} Arguments: ${toolDefinition.parameters}.`;
}

function toDefinition(tool: AgentInteractiveToolSpec): AgentInteractiveToolDefinition {
  return {
    description: tool.description,
    name: tool.name,
    parameters: tool.parameters,
    permission: tool.permission
  };
}
