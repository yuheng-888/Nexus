import type { AgentStartOptions, ApiConfig, ApiProviderPreset, ApiTestResult, Conversation, ConversationSummary, Plugin, Skill, InstallResult, DirectoryEntry, FileReadResult, PluginSearchRequest, SearchMatch, SearchReplaceApplyResult, SearchReplacePreviewResult, SearchReplaceRequest, SearchRequest, SessionSnapshot, SkillsSearchRequest, SubagentProfile, SubagentRun, SubagentStartOptions, TerminalCreateOptions, WorkspaceInfo } from "../contracts.js";
import type { NexusDialogApi } from "../dialogContracts.js";
import type { NexusGitApi } from "../gitContracts.js";
import type { NexusLanguageApi } from "../languageContracts.js";
import type { RagContextBundle, RagIndexStatus, RagIndexSummary, RagSearchRequest, RagSearchResult } from "../ragContracts.js";
import type { NexusReverseApi } from "../reverseContracts.js";
import type { NexusShellApi } from "../shellContracts.js";
import type { NexusTestApi } from "../testContracts.js";
import type { NexusWorkflowApi } from "../workflowContracts.js";

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
  dialog: NexusDialogApi;
  languages: NexusLanguageApi;
  git: NexusGitApi;
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
  reverse: NexusReverseApi;
  search(request: SearchRequest): Promise<SearchMatch[]>;
  searchReplace: {
    apply(request: SearchReplaceRequest): Promise<SearchReplaceApplyResult>;
    preview(request: SearchReplaceRequest): Promise<SearchReplacePreviewResult>;
  };
  shell: NexusShellApi;
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
  workflows: NexusWorkflowApi;
  terminal: {
    create(options: TerminalCreateOptions): Promise<SessionSnapshot>;
  };
  tests: NexusTestApi;
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

export {};
