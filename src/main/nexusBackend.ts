import type { AgentStartOptions, SessionSnapshot, SubagentProfile, SubagentRun, SubagentStartOptions, TerminalCreateOptions, WorkspaceInfo } from "../contracts.js";
import type { AgentModelClient } from "./agentModelClient.js";
import { AgentRuntimeService } from "./agentRuntimeService.js";
import type { AgentToolRunner } from "./agentTools.js";
import { ApiConfigService } from "./apiConfigService.js";
import { ConversationService } from "./conversationService.js";
import { FileService } from "./fileService.js";
import { GitService } from "./gitService.js";
import { GitHubPrService } from "./gitHubPrService.js";
import { GitPublishService } from "./gitPublishService.js";
import { LanguageService } from "./languageService.js";
import { MarketplaceService } from "./marketplaceService.js";
import { NativeAgentGitHubPublishToolProvider } from "./agentGitHubPublishTools.js";
import { NativeAgentGitHubPullRequestToolProvider } from "./agentGitHubPullRequestTools.js";
import { NativeAgentLanguageToolProvider } from "./agentLanguageTools.js";
import { NativeAgentMcpToolProvider } from "./agentMcpTools.js";
import { NativeAgentScriptToolProvider } from "./agentScriptTools.js";
import { NativeAgentTestToolProvider } from "./agentTestTools.js";
import { NativeAgentWorkflowToolProvider } from "./agentWorkflowTools.js";
import { McpService } from "./mcpService.js";
import { resolveWorkspacePath } from "./pathGuards.js";
import { RagService } from "./ragService.js";
import { ReverseService } from "./reverseService.js";
import { SearchService } from "./searchService.js";
import type { SessionManager } from "./sessionManager.js";
import { ScriptService } from "./scriptService.js";
import { SubagentService } from "./subagentService.js";
import { TestService } from "./testService.js";
import { WorkflowService } from "./workflowService.js";
import { WorkspaceStateStore, type WorkspaceState } from "./workspaceStateStore.js";

const DEFAULT_SHELL = "zsh";

export interface NexusBackendOptions {
  readonly apiConfig?: ApiConfigService;
  readonly conversations?: ConversationService;
  readonly modelClient?: AgentModelClient;
  readonly rag?: RagService;
  readonly reverse?: ReverseService;
  readonly toolRunner?: AgentToolRunner;
  readonly workspaceState?: WorkspaceStateRecorder;
}

export interface WorkspaceStateRecorder {
  load(): WorkspaceState;
  recordOpened(workspaceRoot: string): void;
}

export class NexusBackend {
  readonly files: FileService;
  readonly git: GitService;
  readonly gitHubPr: GitHubPrService;
  readonly gitPublish: GitPublishService;
  readonly search: SearchService;
  readonly scripts: ScriptService;
  readonly languages: LanguageService;
  readonly marketplace: MarketplaceService;
  readonly mcp: McpService;
  readonly rag: RagService;
  readonly reverse: ReverseService;
  readonly conversations: ConversationService;
  readonly subagents: SubagentService;
  readonly tests: TestService;
  readonly workflows: WorkflowService;
  readonly apiConfig: ApiConfigService;
  private readonly agentRuntime: AgentRuntimeService;
  private config: WorkspaceInfo;
  private readonly sessions: SessionManager;
  private readonly workspaceState: WorkspaceStateRecorder;

  constructor(config: WorkspaceInfo, sessions: SessionManager, options: NexusBackendOptions = {}) {
    let workflowService: WorkflowService | undefined;
    this.config = config;
    this.sessions = sessions;
    this.workspaceState = options.workspaceState ?? new WorkspaceStateStore();
    this.files = new FileService({ workspaceRoot: config.root });
    this.search = new SearchService({ workspaceRoot: config.root });
    this.scripts = new ScriptService({ workspaceRoot: config.root });
    this.languages = new LanguageService({ workspaceRoot: config.root });
    this.git = new GitService({ workspaceRoot: config.root });
    this.gitHubPr = new GitHubPrService({ git: this.git, workspaceRoot: config.root });
    this.gitPublish = new GitPublishService({ git: this.git, workspaceRoot: config.root });
    this.marketplace = new MarketplaceService();
    this.mcp = new McpService();
    this.rag = options.rag ?? new RagService({ workspaceRoot: config.root });
    this.reverse = options.reverse ?? new ReverseService();
    this.tests = new TestService({ workspaceRoot: config.root });
    this.conversations = options.conversations ?? new ConversationService();
    this.apiConfig = options.apiConfig ?? new ApiConfigService();
    this.agentRuntime = new AgentRuntimeService({
      apiConfig: this.apiConfig,
      conversations: this.conversations,
      files: this.files,
      git: this.git,
      gitHubPublish: new NativeAgentGitHubPublishToolProvider({ service: this.gitPublish }),
      gitHubPullRequests: new NativeAgentGitHubPullRequestToolProvider({ service: this.gitHubPr }),
      languages: new NativeAgentLanguageToolProvider({ service: this.languages }),
      mcpTools: new NativeAgentMcpToolProvider({ service: this.mcp }),
      modelClient: options.modelClient,
      rag: this.rag,
      reverse: this.reverse,
      scripts: new NativeAgentScriptToolProvider({ service: this.scripts }),
      search: this.search,
      sessions,
      tests: new NativeAgentTestToolProvider({ service: this.tests }),
      toolRunner: options.toolRunner,
      workflows: new NativeAgentWorkflowToolProvider({ service: () => requireWorkflowService(workflowService) })
    });
    this.subagents = new SubagentService(this.agentRuntime);
    workflowService = new WorkflowService({
      git: this.git,
      rag: this.rag,
      subagents: this.subagents,
      workspaceRoot: config.root
    });
    this.workflows = workflowService;
  }

  getWorkspace(): WorkspaceInfo {
    return this.config;
  }

  getRecentWorkspaces(): readonly string[] {
    return this.workspaceState.load().recentWorkspaceRoots;
  }

  openRecentWorkspace(workspaceRoot: string): WorkspaceInfo {
    if (!this.getRecentWorkspaces().includes(workspaceRoot)) {
      throw new Error(`Workspace is not in recent list: ${workspaceRoot}`);
    }

    return this.setWorkspaceRoot(workspaceRoot);
  }

  setWorkspaceRoot(workspaceRoot: string): WorkspaceInfo {
    this.workspaceState.recordOpened(workspaceRoot);
    this.config = { ...this.config, root: workspaceRoot };
    this.files.setWorkspaceRoot(workspaceRoot);
    this.search.setWorkspaceRoot(workspaceRoot);
    this.scripts.setWorkspaceRoot(workspaceRoot);
    this.languages.setWorkspaceRoot(workspaceRoot);
    this.git.setWorkspaceRoot(workspaceRoot);
    this.gitHubPr.setWorkspaceRoot(workspaceRoot);
    this.gitPublish.setWorkspaceRoot(workspaceRoot);
    this.rag.setWorkspaceRoot(workspaceRoot);
    this.tests.setWorkspaceRoot(workspaceRoot);
    this.workflows.setWorkspaceRoot(workspaceRoot);

    return this.config;
  }

  createTerminal(options: TerminalCreateOptions): SessionSnapshot {
    const workspaceRoot = this.requireWorkspaceRoot();
    const cwd = resolveWorkspacePath(workspaceRoot, options.cwd ?? ".");
    const shell = options.shell ?? process.env.SHELL ?? DEFAULT_SHELL;

    return this.sessions.create({
      args: ["-l"],
      cols: options.cols,
      command: shell,
      cwd,
      kind: "terminal",
      rows: options.rows
    });
  }

  startAgent(options: AgentStartOptions): SessionSnapshot {
    return this.agentRuntime.start({
      attachments: options.attachments,
      conversationId: options.conversationId,
      cwd: options.cwd,
      kind: "agent",
      model: options.model,
      prompt: options.prompt,
      workspaceRoot: this.config.root
    });
  }

  getSubagentProfiles(): readonly SubagentProfile[] {
    return this.subagents.getProfiles();
  }

  listSubagents(): readonly SubagentRun[] {
    return this.subagents.listRuns();
  }

  startSubagent(options: SubagentStartOptions): SubagentRun {
    return this.subagents.start({
      options,
      workspaceRoot: this.config.root
    });
  }

  killSession(sessionId: string): void {
    this.sessions.kill(sessionId);
  }

  resizeSession(sessionId: string, cols: number, rows: number): void {
    this.sessions.resize(sessionId, cols, rows);
  }

  writeSession(sessionId: string, data: string): void {
    this.sessions.write(sessionId, data);
  }

  handleSessionExit(sessionId: string, exitCode: number): void {
    this.subagents.handleSessionExit(sessionId, exitCode);
  }

  private requireWorkspaceRoot(): string {
    if (this.config.root === null) {
      throw new Error("No workspace is open");
    }

    return this.config.root;
  }
}

function requireWorkflowService(service: WorkflowService | undefined): WorkflowService {
  if (service === undefined) throw new Error("Workflow service is not configured.");
  return service;
}
