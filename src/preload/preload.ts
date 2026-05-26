import { contextBridge, ipcRenderer } from "electron";
import type { AgentStartOptions, Plugin, Skill, InstallResult, ApiConfig, ApiProviderPreset, ApiTestResult, Conversation, ConversationSummary, McpMarketplaceServer, McpSearchRequest, McpServer, McpServerAddRequest, PluginSearchRequest, SearchReplaceRequest, SearchRequest, SkillsSearchRequest, SubagentProfile, SubagentRun, SubagentStartOptions, TerminalCreateOptions } from "../contracts.js";
import type { DialogPathPickRequest, DialogPathPickResult } from "../dialogContracts.js";
import type { NexusGitApi } from "../gitContracts.js";
import type { LanguageCompletionList, LanguageDiagnostic, LanguageDocumentInput, LanguageDocumentSymbol, LanguageHover, LanguageLocation, LanguagePathRequest, LanguagePositionRequest } from "../languageContracts.js";
import type { RagContextBundle, RagIndexStatus, RagIndexSummary, RagSearchRequest, RagSearchResult } from "../ragContracts.js";
import type { ReverseAnalysisRequest, ReverseAnalysisResult, ReverseAsarDiffRequest, ReverseAsarDiffResult, ReverseAsarExtractRequest, ReverseAsarExtractResult, ReverseAsarInspectRequest, ReverseAsarInspectResult, ReverseAsarPackRequest, ReverseAsarPackResult, ReverseJsHookGenerateRequest, ReverseJsHookGenerateResult, ReverseJsHookInjectRequest, ReverseJsHookInjectResult, ReverseJsHookRestoreRequest, ReverseJsHookRestoreResult, ReverseProject, ReverseProjectDraft, ReverseTargetDetection } from "../reverseContracts.js";
import type { NexusScriptApi } from "../scriptContracts.js";
import type { ShellRevealResult } from "../shellContracts.js";
import type { NexusTestApi } from "../testContracts.js";
import type { WorkflowDefinition, WorkflowDefinitionDraft, WorkflowRun, WorkflowRunRequest } from "../workflowContracts.js";

const gitApi: NexusGitApi = {
  abortMerge: () => ipcRenderer.invoke("nexus:git:abortMerge"),
  abortRebase: () => ipcRenderer.invoke("nexus:git:abortRebase"),
  addRemote: (request) => ipcRenderer.invoke("nexus:git:addRemote", request),
  branches: (cwd) => ipcRenderer.invoke("nexus:git:branches", cwd),
  checkoutBranch: (request) => ipcRenderer.invoke("nexus:git:checkoutBranch", request),
  commit: (message) => ipcRenderer.invoke("nexus:git:commit", message),
  createBranch: (request) => ipcRenderer.invoke("nexus:git:createBranch", request),
  createTag: (request) => ipcRenderer.invoke("nexus:git:createTag", request),
  deleteBranch: (request) => ipcRenderer.invoke("nexus:git:deleteBranch", request),
  deleteTag: (name) => ipcRenderer.invoke("nexus:git:deleteTag", name),
  diff: (request) => ipcRenderer.invoke("nexus:git:diff", request),
  discardAll: () => ipcRenderer.invoke("nexus:git:discardAll"),
  discardFile: (path) => ipcRenderer.invoke("nexus:git:discardFile", path),
  fetch: (request) => ipcRenderer.invoke("nexus:git:fetch", request),
  init: (request) => ipcRenderer.invoke("nexus:git:init", request),
  listBranches: (cwd) => ipcRenderer.invoke("nexus:git:listBranches", cwd),
  log: (request) => ipcRenderer.invoke("nexus:git:log", request),
  merge: (branch) => ipcRenderer.invoke("nexus:git:merge", branch),
  pull: (request) => ipcRenderer.invoke("nexus:git:pull", request),
  publishSafetyScan: () => ipcRenderer.invoke("nexus:git:publishSafetyScan"),
  publishToGitHub: (request) => ipcRenderer.invoke("nexus:git:publishToGitHub", request),
  createPullRequest: (request) => ipcRenderer.invoke("nexus:git:createPullRequest", request),
  listPullRequestReviews: (request) => ipcRenderer.invoke("nexus:git:listPullRequestReviews", request),
  listPullRequests: (request) => ipcRenderer.invoke("nexus:git:listPullRequests", request),
  push: (request) => ipcRenderer.invoke("nexus:git:push", request),
  rebase: (branch) => ipcRenderer.invoke("nexus:git:rebase", branch),
  removeRemote: (name) => ipcRenderer.invoke("nexus:git:removeRemote", name),
  remotes: (cwd) => ipcRenderer.invoke("nexus:git:remotes", cwd),
  show: (ref) => ipcRenderer.invoke("nexus:git:show", ref),
  stage: (path) => ipcRenderer.invoke("nexus:git:stage", path),
  stageAll: () => ipcRenderer.invoke("nexus:git:stageAll"),
  stashApply: (ref) => ipcRenderer.invoke("nexus:git:stashApply", ref),
  stashDrop: (ref) => ipcRenderer.invoke("nexus:git:stashDrop", ref),
  stashList: () => ipcRenderer.invoke("nexus:git:stashList"),
  stashPop: (ref) => ipcRenderer.invoke("nexus:git:stashPop", ref),
  stashPush: (request) => ipcRenderer.invoke("nexus:git:stashPush", request),
  status: (cwd) => ipcRenderer.invoke("nexus:git:status", cwd),
  summary: (cwd) => ipcRenderer.invoke("nexus:git:summary", cwd),
  tagList: () => ipcRenderer.invoke("nexus:git:tagList"),
  unstage: (path) => ipcRenderer.invoke("nexus:git:unstage", path),
  unstageAll: () => ipcRenderer.invoke("nexus:git:unstageAll")
};

const nexusApi = {
  agent: {
    start: (options: AgentStartOptions) => ipcRenderer.invoke("nexus:agent:start", options)
  },
  api: {
    presets: (): Promise<ApiProviderPreset[]> => ipcRenderer.invoke("nexus:api:presets"),
    configs: (): Promise<{ configs: ApiConfig[]; activeId: string | null }> => ipcRenderer.invoke("nexus:api:configs"),
    add: (config: Omit<ApiConfig, "id">): Promise<ApiConfig> => ipcRenderer.invoke("nexus:api:add", config),
    update: (id: string, updates: Partial<ApiConfig>): Promise<ApiConfig | null> => ipcRenderer.invoke("nexus:api:update", id, updates),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke("nexus:api:remove", id),
    setActive: (id: string | null): Promise<void> => ipcRenderer.invoke("nexus:api:setActive", id),
    active: (): Promise<ApiConfig | null> => ipcRenderer.invoke("nexus:api:active"),
    test: (id: string): Promise<ApiTestResult> => ipcRenderer.invoke("nexus:api:test", id),
  },
  file: {
    find: (query?: string) => ipcRenderer.invoke("nexus:file:find", query),
    list: (path?: string) => ipcRenderer.invoke("nexus:file:list", path),
    read: (path: string) => ipcRenderer.invoke("nexus:file:read", path),
    readAbsolute: (path: string) => ipcRenderer.invoke("nexus:file:readAbsolute", path),
    write: (path: string, content: string) => ipcRenderer.invoke("nexus:file:write", path, content),
    writeAbsolute: (path: string, content: string) => ipcRenderer.invoke("nexus:file:writeAbsolute", path, content)
  },
  languages: {
    completions: (request: LanguagePositionRequest): Promise<LanguageCompletionList> => {
      return ipcRenderer.invoke("nexus:languages:completions", request);
    },
    definition: (request: LanguagePositionRequest): Promise<readonly LanguageLocation[]> => {
      return ipcRenderer.invoke("nexus:languages:definition", request);
    },
    diagnostics: (request: LanguagePathRequest): Promise<readonly LanguageDiagnostic[]> => {
      return ipcRenderer.invoke("nexus:languages:diagnostics", request);
    },
    documentSymbols: (request: LanguagePathRequest): Promise<readonly LanguageDocumentSymbol[]> => {
      return ipcRenderer.invoke("nexus:languages:documentSymbols", request);
    },
    hover: (request: LanguagePositionRequest): Promise<LanguageHover | null> => {
      return ipcRenderer.invoke("nexus:languages:hover", request);
    },
    openDocument: (input: LanguageDocumentInput): Promise<void> => {
      return ipcRenderer.invoke("nexus:languages:openDocument", input);
    },
    references: (request: LanguagePositionRequest): Promise<readonly LanguageLocation[]> => {
      return ipcRenderer.invoke("nexus:languages:references", request);
    },
    updateDocument: (input: LanguageDocumentInput): Promise<void> => {
      return ipcRenderer.invoke("nexus:languages:updateDocument", input);
    }
  },
  git: gitApi,
  conversations: {
    clear: (id: string): Promise<Conversation> => ipcRenderer.invoke("nexus:conversations:clear", id),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke("nexus:conversations:delete", id),
    get: (id: string): Promise<Conversation> => ipcRenderer.invoke("nexus:conversations:get", id),
    list: (): Promise<readonly ConversationSummary[]> => ipcRenderer.invoke("nexus:conversations:list"),
  },
  dialog: {
    pickPath: (request: DialogPathPickRequest): Promise<DialogPathPickResult> => {
      return ipcRenderer.invoke("nexus:dialog:pickPath", request);
    }
  },
  marketplace: {
    plugins: {
      installed: (): Promise<Plugin[]> => ipcRenderer.invoke("nexus:plugins:installed"),
      list: (): Promise<Plugin[]> => ipcRenderer.invoke("nexus:plugins:list"),
      search: (request: PluginSearchRequest): Promise<Plugin[]> => ipcRenderer.invoke("nexus:plugins:search", request),
      install: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:plugins:install", id),
      uninstall: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:plugins:uninstall", id),
      toggle: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:plugins:toggle", id),
    },
    skills: {
      installed: (): Promise<Skill[]> => ipcRenderer.invoke("nexus:skills:installed"),
      list: (): Promise<Skill[]> => ipcRenderer.invoke("nexus:skills:list"),
      search: (request: SkillsSearchRequest): Promise<Skill[]> => ipcRenderer.invoke("nexus:skills:search", request),
      install: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:skills:install", id),
      uninstall: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:skills:uninstall", id),
      toggle: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:skills:toggle", id),
    },
  },
  mcp: {
    add: (request: McpServerAddRequest): Promise<InstallResult> => ipcRenderer.invoke("nexus:mcp:add", request),
    install: (id: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:mcp:install", id),
    list: (): Promise<readonly McpServer[]> => ipcRenderer.invoke("nexus:mcp:list"),
    remove: (name: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:mcp:remove", name),
    search: (request: McpSearchRequest): Promise<readonly McpMarketplaceServer[]> => ipcRenderer.invoke("nexus:mcp:search", request),
    toggle: (name: string): Promise<InstallResult> => ipcRenderer.invoke("nexus:mcp:toggle", name),
  },
  rag: {
    context: (request: RagSearchRequest): Promise<RagContextBundle> => ipcRenderer.invoke("nexus:rag:context", request),
    index: {
      build: (): Promise<RagIndexSummary> => ipcRenderer.invoke("nexus:rag:index:build"),
      clear: (): Promise<RagIndexStatus> => ipcRenderer.invoke("nexus:rag:index:clear"),
      status: (): Promise<RagIndexStatus> => ipcRenderer.invoke("nexus:rag:index:status")
    },
    search: (request: RagSearchRequest): Promise<readonly RagSearchResult[]> => ipcRenderer.invoke("nexus:rag:search", request)
  },
  reverse: {
    analysis: {
      scan: (request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult> => {
        return ipcRenderer.invoke("nexus:reverse:analysis:scan", request);
      }
    },
    asar: {
      diff: (request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult> => {
        return ipcRenderer.invoke("nexus:reverse:asar:diff", request);
      },
      extract: (request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult> => {
        return ipcRenderer.invoke("nexus:reverse:asar:extract", request);
      },
      inspect: (request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult> => {
        return ipcRenderer.invoke("nexus:reverse:asar:inspect", request);
      },
      pack: (request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult> => {
        return ipcRenderer.invoke("nexus:reverse:asar:pack", request);
      }
    },
    jshook: {
      generate: (request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult> => {
        return ipcRenderer.invoke("nexus:reverse:jshook:generate", request);
      },
      inject: (request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult> => {
        return ipcRenderer.invoke("nexus:reverse:jshook:inject", request);
      },
      restore: (request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult> => {
        return ipcRenderer.invoke("nexus:reverse:jshook:restore", request);
      }
    },
    projects: {
      add: (draft: ReverseProjectDraft): Promise<ReverseProject> => {
        return ipcRenderer.invoke("nexus:reverse:projects:add", draft);
      },
      list: (): Promise<readonly ReverseProject[]> => ipcRenderer.invoke("nexus:reverse:projects:list"),
      remove: (id: string): Promise<boolean> => ipcRenderer.invoke("nexus:reverse:projects:remove", id)
    },
    target: {
      detect: (path: string): Promise<ReverseTargetDetection> => {
        return ipcRenderer.invoke("nexus:reverse:target:detect", path);
      }
    }
  },
  search: (request: SearchRequest) => ipcRenderer.invoke("nexus:search", request),
  searchReplace: {
    apply: (request: SearchReplaceRequest) => ipcRenderer.invoke("nexus:search:replaceApply", request),
    preview: (request: SearchReplaceRequest) => ipcRenderer.invoke("nexus:search:replacePreview", request)
  },
  scripts: {
    discover: () => ipcRenderer.invoke("nexus:scripts:discover"),
    run: (request) => ipcRenderer.invoke("nexus:scripts:run", request)
  } satisfies NexusScriptApi,
  shell: {
    revealPath: (path: string): Promise<ShellRevealResult> => ipcRenderer.invoke("nexus:shell:revealPath", path)
  },
  session: {
    kill: (sessionId: string) => ipcRenderer.invoke("nexus:session:kill", sessionId),
    onData: (handler: (event: { data: string; sessionId: string }) => void) => {
      return subscribe("nexus:session:data", handler);
    },
    onExit: (handler: (event: { exitCode: number; sessionId: string }) => void) => {
      return subscribe("nexus:session:exit", handler);
    },
    resize: (sessionId: string, cols: number, rows: number) => {
      return ipcRenderer.invoke("nexus:session:resize", sessionId, cols, rows);
    },
    write: (sessionId: string, data: string) => ipcRenderer.invoke("nexus:session:write", sessionId, data)
  },
  subagents: {
    list: (): Promise<readonly SubagentRun[]> => ipcRenderer.invoke("nexus:subagents:list"),
    profiles: (): Promise<readonly SubagentProfile[]> => ipcRenderer.invoke("nexus:subagents:profiles"),
    start: (options: SubagentStartOptions): Promise<SubagentRun> => ipcRenderer.invoke("nexus:subagents:start", options)
  },
  tests: {
    discover: () => ipcRenderer.invoke("nexus:tests:discover"),
    run: (request) => ipcRenderer.invoke("nexus:tests:run", request)
  } satisfies NexusTestApi,
  workflows: {
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke("nexus:workflows:delete", id),
    get: (id: string): Promise<WorkflowDefinition> => ipcRenderer.invoke("nexus:workflows:get", id),
    list: (): Promise<readonly WorkflowDefinition[]> => ipcRenderer.invoke("nexus:workflows:list"),
    run: (request: WorkflowRunRequest): Promise<WorkflowRun> => ipcRenderer.invoke("nexus:workflows:run", request),
    runs: (): Promise<readonly WorkflowRun[]> => ipcRenderer.invoke("nexus:workflows:runs"),
    save: (definition: WorkflowDefinitionDraft): Promise<WorkflowDefinition> => {
      return ipcRenderer.invoke("nexus:workflows:save", definition);
    }
  },
  terminal: {
    create: (options: TerminalCreateOptions) => ipcRenderer.invoke("nexus:terminal:create", options)
  },
  workspace: {
    get: () => ipcRenderer.invoke("nexus:workspace:get"),
    open: () => ipcRenderer.invoke("nexus:workspace:open"),
    openRecent: (workspaceRoot: string) => ipcRenderer.invoke("nexus:workspace:openRecent", workspaceRoot),
    recent: () => ipcRenderer.invoke("nexus:workspace:recent")
  }
};

contextBridge.exposeInMainWorld("nexus", nexusApi);

function subscribe<T>(channel: string, handler: (event: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => handler(payload);

  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
}
