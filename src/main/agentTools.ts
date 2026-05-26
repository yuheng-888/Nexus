import type { DirectoryEntry } from "../contracts.js";
import type { RagContextBundle, RagSearchRequest } from "../ragContracts.js";
import type { FileService } from "./fileService.js";
import type { GitService } from "./gitService.js";
import { resolveWorkspacePath } from "./pathGuards.js";
import {
  formatReverseAnalysis,
  formatReverseTargetDetection,
  type ReverseContextProvider
} from "./reverseAgentTools.js";
import type { SearchService } from "./searchService.js";

export interface AgentToolContext {
  readonly cwd: string;
  readonly files: FileService;
  readonly git: GitService;
  readonly prompt: string;
  readonly rag?: RagContextProvider;
  readonly reverse?: ReverseContextProvider;
  readonly search: SearchService;
  readonly workspaceRoot: string;
}

export interface AgentToolResult {
  readonly name: string;
  readonly ok: boolean;
  readonly output: string;
}

export interface AgentToolRunner {
  runStartupTools(context: AgentToolContext): Promise<readonly AgentToolResult[]>;
}

export interface RagContextProvider {
  context(request: RagSearchRequest): Promise<RagContextBundle>;
}

export interface NativeAgentToolRunnerOptions {
  readonly rag?: RagContextProvider;
  readonly reverse?: ReverseContextProvider;
}

interface AgentTool {
  readonly name: string;
  run(context: AgentToolContext): Promise<string>;
}

export class NativeAgentToolRunner implements AgentToolRunner {
  private readonly rag: RagContextProvider | undefined;
  private readonly reverse: ReverseContextProvider | undefined;

  constructor(options: NativeAgentToolRunnerOptions = {}) {
    this.rag = options.rag;
    this.reverse = options.reverse;
  }

  async runStartupTools(context: AgentToolContext): Promise<readonly AgentToolResult[]> {
    const results: AgentToolResult[] = [];
    const toolContext = { ...context, rag: this.rag, reverse: this.reverse };

    for (const tool of getStartupTools({ includeRag: this.rag !== undefined, includeReverse: this.reverse !== undefined })) {
      results.push(await runTool(tool, toolContext));
    }

    return results;
  }
}

function getStartupTools(options: {
  readonly includeRag: boolean;
  readonly includeReverse: boolean;
}): readonly AgentTool[] {
  const tools: AgentTool[] = [
    {
      name: "workspace.list_directory",
      run: listWorkingDirectory
    },
    {
      name: "git.status",
      run: readGitStatus
    }
  ];

  if (options.includeRag) {
    tools.push({
      name: "rag.retrieve_context",
      run: retrieveRagContext
    });
  }

  if (options.includeReverse) {
    tools.push(
      {
        name: "reverse.detect_target",
        run: detectReverseTarget
      },
      {
        name: "reverse.scan_javascript",
        run: scanReverseJavaScript
      }
    );
  }

  return tools;
}

async function runTool(tool: AgentTool, context: AgentToolContext): Promise<AgentToolResult> {
  try {
    return {
      name: tool.name,
      ok: true,
      output: await tool.run(context)
    };
  } catch (error) {
    return {
      name: tool.name,
      ok: false,
      output: error instanceof Error ? error.message : String(error)
    };
  }
}

async function listWorkingDirectory(context: AgentToolContext): Promise<string> {
  const entries = await context.files.listDirectory(context.cwd);

  return entries.map(formatDirectoryEntry).join("\n");
}

function formatDirectoryEntry(entry: DirectoryEntry): string {
  return `${entry.isDirectory ? "dir " : "file"} ${entry.path}`;
}

async function readGitStatus(context: AgentToolContext): Promise<string> {
  const result = await context.git.status(context.cwd);

  if (result.exitCode === 0) {
    return result.stdout.trim() === "" ? "clean" : result.stdout.trimEnd();
  }

  return `git status failed (${result.exitCode}): ${result.stderr.trimEnd()}`;
}

async function retrieveRagContext(context: AgentToolContext): Promise<string> {
  if (context.rag === undefined) {
    return "Local RAG is not configured.";
  }

  const bundle = await context.rag.context({ limit: 6, query: context.prompt });
  if (bundle.results.length === 0) return "No local RAG results matched the prompt.";

  return bundle.results.map(formatRagResult).join("\n\n");
}

function formatRagResult(result: RagContextBundle["results"][number]): string {
  return [
    `${result.path}:${result.startLine}-${result.endLine} score=${result.score}`,
    result.symbols.length === 0 ? "" : `symbols: ${result.symbols.join(", ")}`,
    result.content
  ].filter(Boolean).join("\n");
}

async function detectReverseTarget(context: AgentToolContext): Promise<string> {
  if (context.reverse === undefined) throw new Error("Reverse tools are not configured.");

  return formatReverseTargetDetection(
    await context.reverse.detectTarget(resolveToolTargetPath(context))
  );
}

async function scanReverseJavaScript(context: AgentToolContext): Promise<string> {
  if (context.reverse === undefined) throw new Error("Reverse tools are not configured.");

  return formatReverseAnalysis(
    await context.reverse.scanJavaScript({ path: resolveToolTargetPath(context) })
  );
}

function resolveToolTargetPath(context: AgentToolContext): string {
  return resolveWorkspacePath(context.workspaceRoot, context.cwd);
}
