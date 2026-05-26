import { dialog, ipcMain, type WebContents } from "electron";
import type { AgentStartOptions, McpSearchRequest, McpServerAddRequest, SearchRequest, SubagentStartOptions, TerminalCreateOptions } from "../contracts.js";
import type {
  GitBranchCheckoutRequest,
  GitBranchCreateRequest,
  GitBranchDeleteRequest,
  GitDiffRequest,
  GitFetchRequest,
  GitLogRequest,
  GitPullRequest,
  GitPushRequest,
  GitRemoteRequest,
  GitStashPushRequest,
  GitTagCreateRequest
} from "../gitContracts.js";
import type { LanguageDocumentInput, LanguagePathRequest, LanguagePositionRequest } from "../languageContracts.js";
import type { RagSearchRequest } from "../ragContracts.js";
import type {
  ReverseAnalysisRequest,
  ReverseAsarDiffRequest,
  ReverseAsarExtractRequest,
  ReverseAsarInspectRequest,
  ReverseAsarPackRequest,
  ReverseJsHookGenerateRequest,
  ReverseJsHookInjectRequest,
  ReverseJsHookRestoreRequest,
  ReverseProjectDraft
} from "../reverseContracts.js";
import type { WorkflowDefinitionDraft, WorkflowRunRequest } from "../workflowContracts.js";
import { registerDialogHandlers } from "./dialogIpc.js";
import { registerMarketplaceHandlers } from "./marketplaceIpc.js";
import type { NexusBackend } from "./nexusBackend.js";
import { registerShellHandlers } from "./shellIpc.js";

const DATA_EVENT = "nexus:session:data";
const EXIT_EVENT = "nexus:session:exit";

export function registerIpcHandlers(backend: NexusBackend): void {
  registerWorkspaceHandlers(backend);
  registerDialogHandlers();
  registerFileHandlers(backend);
  registerLanguageHandlers(backend);
  registerSearchHandlers(backend);
  registerGitHandlers(backend);
  registerSessionHandlers(backend);
  registerConversationHandlers(backend);
  registerSubagentHandlers(backend);
  registerWorkflowHandlers(backend);
  registerMcpHandlers(backend);
  registerRagHandlers(backend);
  registerReverseHandlers(backend);
  registerShellHandlers();
  registerMarketplaceHandlers(backend);
}

export function sendSessionData(target: WebContents, sessionId: string, data: string): void {
  target.send(DATA_EVENT, { data, sessionId });
}

export function sendSessionExit(target: WebContents, sessionId: string, exitCode: number): void {
  target.send(EXIT_EVENT, { exitCode, sessionId });
}

function registerWorkspaceHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:workspace:get", () => backend.getWorkspace());
  ipcMain.handle("nexus:workspace:recent", () => backend.getRecentWorkspaces());
  ipcMain.handle("nexus:workspace:openRecent", (_event, workspaceRoot: string) => {
    return backend.openRecentWorkspace(workspaceRoot);
  });
  ipcMain.handle("nexus:workspace:open", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths[0] === undefined) {
      return null;
    }

    return backend.setWorkspaceRoot(result.filePaths[0]);
  });
}

function registerFileHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:file:find", (_event, query?: string) => backend.files.findFiles(query));
  ipcMain.handle("nexus:file:list", (_event, path?: string) => backend.files.listDirectory(path));
  ipcMain.handle("nexus:file:read", (_event, path: string) => backend.files.readTextFile(path));
  ipcMain.handle("nexus:file:readAbsolute", (_event, path: string) => backend.files.readAbsoluteTextFile(path));
  ipcMain.handle("nexus:file:write", (_event, path: string, content: string) => {
    return backend.files.writeTextFile(path, content);
  });
  ipcMain.handle("nexus:file:writeAbsolute", (_event, path: string, content: string) => {
    return backend.files.writeAbsoluteTextFile(path, content);
  });
}

function registerLanguageHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:languages:openDocument", (_event, input: LanguageDocumentInput) => {
    return backend.languages.openDocument(input);
  });
  ipcMain.handle("nexus:languages:updateDocument", (_event, input: LanguageDocumentInput) => {
    return backend.languages.updateDocument(input);
  });
  ipcMain.handle("nexus:languages:diagnostics", (_event, request: LanguagePathRequest) => {
    return backend.languages.diagnostics(request);
  });
  ipcMain.handle("nexus:languages:completions", (_event, request: LanguagePositionRequest) => {
    return backend.languages.completions(request);
  });
  ipcMain.handle("nexus:languages:hover", (_event, request: LanguagePositionRequest) => {
    return backend.languages.hover(request);
  });
  ipcMain.handle("nexus:languages:definition", (_event, request: LanguagePositionRequest) => {
    return backend.languages.definition(request);
  });
  ipcMain.handle("nexus:languages:references", (_event, request: LanguagePositionRequest) => {
    return backend.languages.references(request);
  });
  ipcMain.handle("nexus:languages:documentSymbols", (_event, request: LanguagePathRequest) => {
    return backend.languages.documentSymbols(request);
  });
}

function registerSearchHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:search", (_event, request: SearchRequest) => backend.search.search(request));
}

function registerGitHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:git:status", (_event, cwd?: string) => backend.git.status(cwd));
  ipcMain.handle("nexus:git:summary", (_event, cwd?: string) => backend.git.summary(cwd));
  ipcMain.handle("nexus:git:branches", (_event, cwd?: string) => backend.git.branches(cwd));
  ipcMain.handle("nexus:git:listBranches", (_event, cwd?: string) => backend.git.listBranches(cwd));
  ipcMain.handle("nexus:git:diff", (_event, request: GitDiffRequest) => backend.git.diff(request));
  ipcMain.handle("nexus:git:stage", (_event, path: string) => backend.git.stage(path));
  ipcMain.handle("nexus:git:unstage", (_event, path: string) => backend.git.unstage(path));
  ipcMain.handle("nexus:git:stageAll", () => backend.git.stageAll());
  ipcMain.handle("nexus:git:unstageAll", () => backend.git.unstageAll());
  ipcMain.handle("nexus:git:commit", (_event, message: string) => backend.git.commit(message));
  ipcMain.handle("nexus:git:remotes", (_event, cwd?: string) => backend.git.remotes(cwd));
  ipcMain.handle("nexus:git:addRemote", (_event, request: GitRemoteRequest) => backend.git.addRemote(request));
  ipcMain.handle("nexus:git:removeRemote", (_event, name: string) => backend.git.removeRemote(name));
  ipcMain.handle("nexus:git:fetch", (_event, request?: GitFetchRequest) => backend.git.fetch(request));
  ipcMain.handle("nexus:git:pull", (_event, request?: GitPullRequest) => backend.git.pull(request));
  ipcMain.handle("nexus:git:push", (_event, request?: GitPushRequest) => backend.git.push(request));
  ipcMain.handle("nexus:git:createBranch", (_event, request: GitBranchCreateRequest) => backend.git.createBranch(request));
  ipcMain.handle("nexus:git:checkoutBranch", (_event, request: GitBranchCheckoutRequest) => backend.git.checkoutBranch(request));
  ipcMain.handle("nexus:git:deleteBranch", (_event, request: GitBranchDeleteRequest) => backend.git.deleteBranch(request));
  ipcMain.handle("nexus:git:log", (_event, request?: GitLogRequest) => backend.git.log(request));
  ipcMain.handle("nexus:git:show", (_event, ref: string) => backend.git.show(ref));
  ipcMain.handle("nexus:git:merge", (_event, branch: string) => backend.git.merge(branch));
  ipcMain.handle("nexus:git:rebase", (_event, branch: string) => backend.git.rebase(branch));
  ipcMain.handle("nexus:git:abortMerge", () => backend.git.abortMerge());
  ipcMain.handle("nexus:git:abortRebase", () => backend.git.abortRebase());
  ipcMain.handle("nexus:git:stashList", () => backend.git.stashList());
  ipcMain.handle("nexus:git:stashPush", (_event, request?: GitStashPushRequest) => backend.git.stashPush(request));
  ipcMain.handle("nexus:git:stashApply", (_event, ref?: string) => backend.git.stashApply(ref));
  ipcMain.handle("nexus:git:stashPop", (_event, ref?: string) => backend.git.stashPop(ref));
  ipcMain.handle("nexus:git:stashDrop", (_event, ref?: string) => backend.git.stashDrop(ref));
  ipcMain.handle("nexus:git:discardFile", (_event, path: string) => backend.git.discardFile(path));
  ipcMain.handle("nexus:git:discardAll", () => backend.git.discardAll());
  ipcMain.handle("nexus:git:tagList", () => backend.git.tagList());
  ipcMain.handle("nexus:git:createTag", (_event, request: GitTagCreateRequest) => backend.git.createTag(request));
  ipcMain.handle("nexus:git:deleteTag", (_event, name: string) => backend.git.deleteTag(name));
}

function registerSessionHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:terminal:create", (_event, options: TerminalCreateOptions) => {
    return backend.createTerminal(options);
  });
  ipcMain.handle("nexus:agent:start", (_event, options: AgentStartOptions) => backend.startAgent(options));
  ipcMain.handle("nexus:session:write", (_event, sessionId: string, data: string) => {
    backend.writeSession(sessionId, data);
  });
  ipcMain.handle("nexus:session:resize", (_event, sessionId: string, cols: number, rows: number) => {
    backend.resizeSession(sessionId, cols, rows);
  });
  ipcMain.handle("nexus:session:kill", (_event, sessionId: string) => {
    backend.killSession(sessionId);
  });
}

function registerSubagentHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:subagents:profiles", () => backend.getSubagentProfiles());
  ipcMain.handle("nexus:subagents:list", () => backend.listSubagents());
  ipcMain.handle("nexus:subagents:start", (_event, options: SubagentStartOptions) => {
    return backend.startSubagent(options);
  });
}

function registerWorkflowHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:workflows:list", () => backend.workflows.listDefinitions());
  ipcMain.handle("nexus:workflows:get", (_event, id: string) => backend.workflows.getDefinition(id));
  ipcMain.handle("nexus:workflows:save", (_event, definition: WorkflowDefinitionDraft) => {
    return backend.workflows.saveDefinition(definition);
  });
  ipcMain.handle("nexus:workflows:delete", (_event, id: string) => backend.workflows.deleteDefinition(id));
  ipcMain.handle("nexus:workflows:run", (_event, request: WorkflowRunRequest) => backend.workflows.run(request));
  ipcMain.handle("nexus:workflows:runs", () => backend.workflows.listRuns());
}

function registerConversationHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:conversations:list", () => backend.conversations.listConversations());
  ipcMain.handle("nexus:conversations:get", (_event, id: string) => {
    return backend.conversations.getConversation(id);
  });
  ipcMain.handle("nexus:conversations:clear", (_event, id: string) => {
    return backend.conversations.clearConversation(id);
  });
  ipcMain.handle("nexus:conversations:delete", (_event, id: string) => {
    return backend.conversations.deleteConversation(id);
  });
}

function registerMcpHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:mcp:list", () => backend.mcp.listServers());
  ipcMain.handle("nexus:mcp:add", (_event, request: McpServerAddRequest) => {
    return backend.mcp.addServer(request);
  });
  ipcMain.handle("nexus:mcp:remove", (_event, name: string) => backend.mcp.removeServer(name));
  ipcMain.handle("nexus:mcp:toggle", (_event, name: string) => backend.mcp.toggleServer(name));
  ipcMain.handle("nexus:mcp:search", (_event, request: McpSearchRequest) => {
    return backend.mcp.searchMarketplace(request);
  });
  ipcMain.handle("nexus:mcp:install", (_event, id: string) => {
    return backend.mcp.installMarketplaceServer(id);
  });
}

function registerRagHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:rag:index:build", () => backend.rag.buildIndex());
  ipcMain.handle("nexus:rag:index:clear", () => backend.rag.clear());
  ipcMain.handle("nexus:rag:index:status", () => backend.rag.status());
  ipcMain.handle("nexus:rag:search", (_event, request: RagSearchRequest) => {
    return backend.rag.search(request);
  });
  ipcMain.handle("nexus:rag:context", (_event, request: RagSearchRequest) => {
    return backend.rag.context(request);
  });
}

function registerReverseHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:reverse:target:detect", (_event, path: string) => {
    return backend.reverse.detectTarget(path);
  });
  ipcMain.handle("nexus:reverse:asar:inspect", (_event, request: ReverseAsarInspectRequest) => {
    return backend.reverse.inspectAsar(request);
  });
  ipcMain.handle("nexus:reverse:asar:extract", (_event, request: ReverseAsarExtractRequest) => {
    return backend.reverse.extractAsar(request);
  });
  ipcMain.handle("nexus:reverse:asar:pack", (_event, request: ReverseAsarPackRequest) => {
    return backend.reverse.packAsar(request);
  });
  ipcMain.handle("nexus:reverse:asar:diff", (_event, request: ReverseAsarDiffRequest) => {
    return backend.reverse.diffAsar(request);
  });
  ipcMain.handle("nexus:reverse:analysis:scan", (_event, request: ReverseAnalysisRequest) => {
    return backend.reverse.scanJavaScript(request);
  });
  ipcMain.handle("nexus:reverse:jshook:generate", (_event, request: ReverseJsHookGenerateRequest) => {
    return backend.reverse.generateJavaScriptHook(request);
  });
  ipcMain.handle("nexus:reverse:jshook:inject", (_event, request: ReverseJsHookInjectRequest) => {
    return backend.reverse.injectJavaScriptHook(request);
  });
  ipcMain.handle("nexus:reverse:jshook:restore", (_event, request: ReverseJsHookRestoreRequest) => {
    return backend.reverse.restoreJavaScriptHook(request);
  });
  ipcMain.handle("nexus:reverse:projects:list", () => backend.reverse.listProjects());
  ipcMain.handle("nexus:reverse:projects:add", (_event, draft: ReverseProjectDraft) => {
    return backend.reverse.addProject(draft);
  });
  ipcMain.handle("nexus:reverse:projects:remove", (_event, id: string) => {
    return backend.reverse.removeProject(id);
  });
}
