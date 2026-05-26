import type { Conversation, ConversationSummary } from "./conversation";
import type { DialogApi } from "./dialog";
import type { GitApi } from "./git";
import type { LanguageApi } from "./language";
import type { InstallResult, Plugin, PluginSearchRequest, Skill, SkillsSearchRequest } from "./marketplace";
import type { McpMarketplaceServer, McpSearchRequest, McpServer, McpServerAddRequest } from "./mcp";
import type { RagContextBundle, RagIndexStatus, RagIndexSummary, RagSearchRequest, RagSearchResult } from "./rag";
import type { ReverseApi } from "./reverse";
import type { ShellApi } from "./shell";
import type { WorkflowApi } from "./workflow";

export type * from "./conversation";
export type * from "./dialog";
export type * from "./git";
export type * from "./language";
export type * from "./marketplace";
export type * from "./mcp";
export type * from "./rag";
export type * from "./reverse";
export type * from "./shell";
export type * from "./workflow";

export interface DirectoryEntry {
  readonly absolutePath: string;
  readonly isDirectory: boolean;
  readonly name: string;
  readonly path: string;
}

export interface FileReadResult {
  readonly absolutePath: string;
  readonly content: string;
  readonly mtimeMs: number;
  readonly path: string;
}

export interface SearchMatch {
  readonly line: number;
  readonly path: string;
  readonly preview: string;
}

export interface SearchReplaceRequest {
  readonly cwd?: string;
  readonly paths?: readonly string[];
  readonly query: string;
  readonly replacement: string;
}

export interface SearchReplaceLinePreview {
  readonly after: string;
  readonly before: string;
  readonly line: number;
}

export interface SearchReplaceFilePreview {
  readonly matches: number;
  readonly path: string;
  readonly previews: readonly SearchReplaceLinePreview[];
}

export interface SearchReplacePreviewResult {
  readonly files: readonly SearchReplaceFilePreview[];
  readonly totalMatches: number;
}

export interface SearchReplaceApplyResult {
  readonly filesChanged: number;
  readonly paths: readonly string[];
  readonly totalMatches: number;
}

export interface SessionSnapshot {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
  readonly id: string;
  readonly kind: "terminal" | "agent" | "subagent";
}

export type ApiProvider = "openai" | "anthropic" | "google" | "deepseek" | "custom";

export interface ApiProviderPreset {
  readonly provider: ApiProvider;
  readonly name: string;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly defaultModel: string;
  readonly authHeader: string;
  readonly authPrefix: string;
  readonly description: string;
}

export interface ApiConfig {
  readonly id: string;
  readonly name: string;
  readonly provider: ApiProvider;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly enabled: boolean;
  readonly customMethod?: "POST" | "GET" | "PUT";
  readonly customHeaders?: Record<string, string>;
  readonly customBodyTemplate?: string;
  readonly customResponsePath?: string;
}

export interface ApiTestResult {
  readonly success: boolean;
  readonly message: string;
  readonly latency?: number;
}

export interface SearchRequest {
  readonly query: string;
  readonly cwd?: string;
}

export interface TerminalCreateOptions {
  readonly cols?: number;
  readonly rows?: number;
  readonly cwd?: string;
  readonly shell?: string;
}

export interface AgentStartOptions {
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly conversationId?: string;
  readonly cwd?: string;
  readonly mode?: "interactive" | "print";
  readonly model?: string;
  readonly outputFormat?: "text" | "json" | "stream-json";
  readonly prompt: string;
}

export interface AgentMessageAttachment {
  readonly dataUrl: string;
  readonly mimeType: string;
  readonly name: string;
}

export interface SubagentProfile {
  readonly description: string;
  readonly id: string;
  readonly name: string;
}

export interface SubagentStartOptions {
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly conversationId?: string;
  readonly cwd?: string;
  readonly model?: string;
  readonly profileId?: string;
  readonly prompt: string;
}

export interface SubagentRun {
  readonly exitCode?: number;
  readonly id: string;
  readonly profile: SubagentProfile;
  readonly prompt: string;
  readonly session: SessionSnapshot;
  readonly startedAt: number;
  readonly status: "running" | "exited";
}

export interface WorkspaceInfo {
  readonly root: string | null;
}

interface NexusApi {
  agent: {
    start(options: AgentStartOptions): Promise<SessionSnapshot>;
  };
  api: {
    presets(): Promise<ApiProviderPreset[]>;
    configs(): Promise<{ configs: ApiConfig[]; activeId: string | null }>;
    add(config: Omit<ApiConfig, "id">): Promise<ApiConfig>;
    update(id: string, updates: Partial<ApiConfig>): Promise<ApiConfig | null>;
    remove(id: string): Promise<boolean>;
    setActive(id: string | null): Promise<void>;
    active(): Promise<ApiConfig | null>;
    test(id: string): Promise<ApiTestResult>;
  };
  file: {
    find(query?: string): Promise<DirectoryEntry[]>;
    list(path?: string): Promise<DirectoryEntry[]>;
    read(path: string): Promise<FileReadResult>;
    readAbsolute(path: string): Promise<FileReadResult>;
    write(path: string, content: string): Promise<FileReadResult>;
    writeAbsolute(path: string, content: string): Promise<FileReadResult>;
  };
  dialog: DialogApi;
  languages: LanguageApi;
  git: GitApi;
  conversations: {
    clear(id: string): Promise<Conversation>;
    delete(id: string): Promise<boolean>;
    get(id: string): Promise<Conversation>;
    list(): Promise<readonly ConversationSummary[]>;
  };
  marketplace: {
    plugins: {
      installed(): Promise<Plugin[]>;
      list(): Promise<Plugin[]>;
      search(request: PluginSearchRequest): Promise<Plugin[]>;
      install(id: string): Promise<InstallResult>;
      uninstall(id: string): Promise<InstallResult>;
      toggle(id: string): Promise<InstallResult>;
    };
    skills: {
      installed(): Promise<Skill[]>;
      list(): Promise<Skill[]>;
      search(request: SkillsSearchRequest): Promise<Skill[]>;
      install(id: string): Promise<InstallResult>;
      uninstall(id: string): Promise<InstallResult>;
      toggle(id: string): Promise<InstallResult>;
    };
  };
  rag: {
    context(request: RagSearchRequest): Promise<RagContextBundle>;
    index: {
      build(): Promise<RagIndexSummary>;
      clear(): Promise<RagIndexStatus>;
      status(): Promise<RagIndexStatus>;
    };
    search(request: RagSearchRequest): Promise<readonly RagSearchResult[]>;
  };
  reverse: ReverseApi;
  shell: ShellApi;
  mcp: {
    add(request: McpServerAddRequest): Promise<InstallResult>;
    install(id: string): Promise<InstallResult>;
    list(): Promise<readonly McpServer[]>;
    remove(name: string): Promise<InstallResult>;
    search(request: McpSearchRequest): Promise<readonly McpMarketplaceServer[]>;
    toggle(name: string): Promise<InstallResult>;
  };
  search(request: SearchRequest): Promise<SearchMatch[]>;
  searchReplace: {
    apply(request: SearchReplaceRequest): Promise<SearchReplaceApplyResult>;
    preview(request: SearchReplaceRequest): Promise<SearchReplacePreviewResult>;
  };
  session: {
    kill(sessionId: string): Promise<void>;
    onData(handler: (event: { data: string; sessionId: string }) => void): () => void;
    onExit(handler: (event: { exitCode: number; sessionId: string }) => void): () => void;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    write(sessionId: string, data: string): Promise<void>;
  };
  subagents: {
    list(): Promise<readonly SubagentRun[]>;
    profiles(): Promise<readonly SubagentProfile[]>;
    start(options: SubagentStartOptions): Promise<SubagentRun>;
  };
  workflows: WorkflowApi;
  terminal: {
    create(options: TerminalCreateOptions): Promise<SessionSnapshot>;
  };
  workspace: {
    get(): Promise<WorkspaceInfo>;
    open(): Promise<WorkspaceInfo | null>;
    openRecent(workspaceRoot: string): Promise<WorkspaceInfo>;
    recent(): Promise<readonly string[]>;
  };
}

declare global {
  interface Window {
    nexus: NexusApi;
  }
}
