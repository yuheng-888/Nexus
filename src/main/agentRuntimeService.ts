import type { AgentMessageAttachment, ApiConfig, SessionKind, SessionSnapshot, SubagentProfile } from "../contracts.js";
import type { RuntimeSessionController, SessionManager } from "./sessionManager.js";
import { HttpAgentModelClient, assertRunnableConfig, type AgentModelClient, type AgentModelMessage } from "./agentModelClient.js";
import {
  NativeAgentInteractiveToolRunner,
  type AgentInteractiveToolContext,
  type AgentInteractiveToolRunner
} from "./agentInteractiveTools.js";
import { NativeAgentToolRunner, type AgentToolResult, type AgentToolRunner, type RagContextProvider } from "./agentTools.js";
import { buildAgentSystemPrompt } from "./agentSystemPrompt.js";
import { createSessionToolApproval } from "./agentToolApproval.js";
import { MAX_TOOL_ROUNDS, runAgentToolLoop } from "./agentToolLoop.js";
import type { ApiConfigService } from "./apiConfigService.js";
import { attachImagesToLastUserMessage } from "./agentAttachmentMessages.js";
import type { AgentGitHubPublishToolProvider } from "./agentGitHubPublishTools.js";
import type { AgentGitHubPullRequestToolProvider } from "./agentGitHubPullRequestTools.js";
import type { AgentLanguageToolProvider } from "./agentLanguageTools.js";
import type { AgentMarketplaceToolProvider } from "./agentMarketplaceTools.js";
import type { AgentMcpToolProvider } from "./agentMcpTools.js";
import type { AgentRagToolProvider } from "./agentRagTools.js";
import type { AgentScriptToolProvider } from "./agentScriptTools.js";
import type { AgentTestToolProvider } from "./agentTestTools.js";
import type { AgentWorkflowToolProvider } from "./agentWorkflowTools.js";
import type { ConversationService } from "./conversationService.js";
import type { FileService } from "./fileService.js";
import type { GitService } from "./gitService.js";
import { resolveWorkspacePath } from "./pathGuards.js";
import type { ReverseContextProvider } from "./reverseAgentTools.js";
import type { SearchService } from "./searchService.js";

export interface AgentRuntimeServiceOptions {
  readonly apiConfig: ApiConfigService;
  readonly conversations?: ConversationService;
  readonly contextTokenLimit?: number;
  readonly files: FileService;
  readonly git: GitService;
  readonly gitHubPublish?: AgentGitHubPublishToolProvider;
  readonly gitHubPullRequests?: AgentGitHubPullRequestToolProvider;
  readonly interactiveToolRunner?: AgentInteractiveToolRunner;
  readonly languages?: AgentLanguageToolProvider;
  readonly marketplace?: AgentMarketplaceToolProvider;
  readonly mcpTools?: AgentMcpToolProvider;
  readonly modelClient?: AgentModelClient;
  readonly rag?: AgentRagToolProvider;
  readonly reverse?: ReverseContextProvider;
  readonly scripts?: AgentScriptToolProvider;
  readonly search: SearchService;
  readonly sessions: SessionManager;
  readonly tests?: AgentTestToolProvider;
  readonly toolRunner?: AgentToolRunner;
  readonly workflows?: AgentWorkflowToolProvider;
}

export interface AgentRuntimeStartInput {
  readonly conversationId?: string;
  readonly conversationPrompt?: string;
  readonly cwd?: string;
  readonly kind: Extract<SessionKind, "agent" | "subagent">;
  readonly model?: string;
  readonly profile?: SubagentProfile;
  readonly prompt: string;
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly workspaceRoot: string | null;
}

interface AgentRuntimeRunInput extends AgentRuntimeStartInput {
  readonly config: ApiConfig;
  readonly cwdForTools: string;
}

const RUNTIME_COMMAND = "nexus-agent-runtime";
const ABORT_EXIT_CODE = 130;
const DEFAULT_CONTEXT_WINDOW_TOKENS = 32000;
const ERROR_EXIT_CODE = 1;
const MIN_USABLE_CONTEXT_TOKENS = 4096;
const SUCCESS_EXIT_CODE = 0;

export class AgentRuntimeService {
  private readonly apiConfig: ApiConfigService;
  private readonly conversations: ConversationService | undefined;
  private readonly contextTokenLimit: number | undefined;
  private readonly files: FileService;
  private readonly git: GitService;
  private readonly interactiveToolRunner: AgentInteractiveToolRunner;
  private readonly modelClient: AgentModelClient;
  private readonly search: SearchService;
  private readonly sessions: SessionManager;
  private readonly toolRunner: AgentToolRunner;

  constructor(options: AgentRuntimeServiceOptions) {
    this.apiConfig = options.apiConfig;
    this.conversations = options.conversations;
    this.contextTokenLimit = options.contextTokenLimit;
    this.files = options.files;
    this.git = options.git;
    this.interactiveToolRunner = options.interactiveToolRunner ?? new NativeAgentInteractiveToolRunner({
      gitHubPublish: options.gitHubPublish,
      gitHubPullRequests: options.gitHubPullRequests,
      languages: options.languages,
      marketplace: options.marketplace,
      mcp: options.mcpTools,
      rag: options.rag,
      reverse: options.reverse,
      scripts: options.scripts,
      tests: options.tests,
      workflows: options.workflows
    });
    this.modelClient = options.modelClient ?? new HttpAgentModelClient();
    this.search = options.search;
    this.sessions = options.sessions;
    this.toolRunner = options.toolRunner ?? new NativeAgentToolRunner({
      rag: options.rag,
      reverse: options.reverse
    });
  }

  start(input: AgentRuntimeStartInput): SessionSnapshot {
    const prepared = this.prepareStartInput(input);
    const sessionOptions = {
      args: buildRuntimeArgs(prepared),
      command: RUNTIME_COMMAND,
      cwd: resolveRuntimeCwd(prepared.workspaceRoot, prepared.cwdForTools),
      kind: prepared.kind
    };

    return this.sessions.createRuntime(sessionOptions, (controller) => this.run(prepared, controller));
  }

  private prepareStartInput(input: AgentRuntimeStartInput): AgentRuntimeRunInput {
    const prompt = requirePrompt(input.prompt);
    const model = input.model?.trim();

    return {
      ...input,
      config: getRunnableConfig(this.apiConfig.getActive(), model),
      cwdForTools: input.cwd ?? ".",
      prompt,
      workspaceRoot: input.workspaceRoot
    };
  }

  private async run(input: AgentRuntimeRunInput, controller: RuntimeSessionController): Promise<void> {
    try {
      emit(controller, "agent.started", toStartedEvent(input));
      const tools = await this.runStartupTools(input, controller);
      const messages = await this.buildModelMessages(input, tools);
      const response = await runAgentToolLoop({
        approval: createSessionToolApproval(controller),
        config: input.config,
        context: this.buildToolContext(input),
        emit: (type, payload) => emit(controller, type, payload),
        messages: attachImagesToLastUserMessage(messages, input.attachments),
        modelClient: this.modelClient,
        signal: controller.signal,
        toolRunner: this.interactiveToolRunner
      });
      await this.persistAssistantMessage(input, response.text);
      emit(controller, "agent.message", { message: response.text });
      emit(controller, "agent.completed", { usage: response.usage ?? null });
      controller.exit(SUCCESS_EXIT_CODE);
    } catch (error) {
      emit(controller, "agent.error", { message: toErrorMessage(error) });
      controller.exit(controller.signal.aborted ? ABORT_EXIT_CODE : ERROR_EXIT_CODE);
    }
  }

  private async runStartupTools(
    input: AgentRuntimeRunInput,
    controller: RuntimeSessionController
  ): Promise<readonly AgentToolResult[]> {
    emit(controller, "agent.tools.started", {});
    if (input.workspaceRoot === null) {
      emit(controller, "agent.tools.skipped", { reason: "No workspace is open" });
      return [];
    }

    const results = await this.toolRunner.runStartupTools({
      cwd: input.cwdForTools,
      files: this.files,
      git: this.git,
      prompt: input.prompt,
      search: this.search,
      workspaceRoot: input.workspaceRoot
    });

    for (const result of results) {
      emit(controller, "agent.tool.completed", result);
    }

    return results;
  }

  private async buildModelMessages(
    input: AgentRuntimeRunInput,
    tools: readonly AgentToolResult[]
  ): Promise<readonly AgentModelMessage[]> {
    const systemPrompt = buildAgentSystemPrompt({
      input,
      interactiveTools: this.interactiveToolRunner.listTools(),
      maxToolRounds: MAX_TOOL_ROUNDS,
      startupTools: tools
    });
    if (this.conversations === undefined || input.conversationId === undefined) {
      return buildStatelessMessages(input, systemPrompt);
    }

    const prepared = await this.conversations.prepareModelMessages({
      contextTokenLimit: getContextTokenLimit(input.config, this.contextTokenLimit),
      conversationId: input.conversationId,
      prompt: input.prompt,
      storedPrompt: input.conversationPrompt,
      systemPrompt
    });
    return prepared.messages;
  }

  private async persistAssistantMessage(input: AgentRuntimeRunInput, text: string): Promise<void> {
    if (this.conversations === undefined || input.conversationId === undefined) return;

    await this.conversations.appendAssistantMessage(
      input.conversationId,
      text,
      getContextTokenLimit(input.config, this.contextTokenLimit)
    );
  }

  private buildToolContext(input: AgentRuntimeRunInput): AgentInteractiveToolContext {
    return {
      cwd: input.cwdForTools,
      files: this.files,
      git: this.git,
      prompt: input.prompt,
      search: this.search,
      workspaceRoot: input.workspaceRoot
    };
  }
}

function buildRuntimeArgs(input: AgentRuntimeRunInput): readonly string[] {
  return [input.kind, input.profile?.id ?? "main"];
}

function requirePrompt(prompt: string | undefined): string {
  const trimmed = prompt?.trim() ?? "";

  if (trimmed === "") {
    throw new Error("Agent prompt is required");
  }

  return trimmed;
}

function getRunnableConfig(config: ApiConfig | null, model: string | undefined): ApiConfig {
  if (config === null) {
    throw new Error("No active API model is configured");
  }

  const runnable = { ...config, model: model === undefined || model === "" ? config.model : model };
  assertRunnableConfig(runnable);

  return runnable;
}

function buildStatelessMessages(
  input: AgentRuntimeRunInput,
  systemPrompt: string
): readonly AgentModelMessage[] {
  return [
    { content: systemPrompt, role: "system" },
    { content: input.prompt, role: "user" }
  ];
}

function getContextTokenLimit(config: ApiConfig, override: number | undefined): number {
  if (override !== undefined) return override;
  return Math.max(MIN_USABLE_CONTEXT_TOKENS, DEFAULT_CONTEXT_WINDOW_TOKENS - config.maxTokens);
}

function resolveRuntimeCwd(workspaceRoot: string | null, cwd: string): string {
  if (workspaceRoot === null) return process.cwd();
  return resolveWorkspacePath(workspaceRoot, cwd);
}

function toStartedEvent(input: AgentRuntimeRunInput): object {
  return {
    kind: input.kind,
    model: input.config.model,
    profile: input.profile?.id ?? null
  };
}

function emit(controller: RuntimeSessionController, type: string, payload: object): void {
  controller.emitData(`${JSON.stringify({ ...payload, type })}\n`);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
