import type {
  AgentMessageAttachment,
  ApiConfig,
  DirectoryEntry,
  SearchMatch,
  SessionSnapshot
} from "../types/nexus";
import type { AppTheme } from "../theme/appTheme";

export interface EditorTab {
  readonly absolutePath: string;
  readonly content: string;
  readonly dirty: boolean;
  readonly mtimeMs: number;
  readonly name: string;
  readonly path: string;
}

export type SidebarPanel = "files" | "search" | "outline" | "git" | "rag" | "workflows" | "mcp" | "plugins" | "skills" | "settings" | null;
export type BottomPanel = "terminal" | "ai" | "problems" | null;

export interface McpServer {
  readonly args: string[];
  readonly command: string;
  readonly enabled: boolean;
  readonly env: Record<string, string>;
  readonly name: string;
}

export interface ChatMessage {
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly content: string;
  readonly role: "user" | "assistant";
  readonly timestamp: number;
}

export interface NexusState {
  readonly activeApiConfig: string | null;
  readonly activeSidebar: SidebarPanel;
  readonly activeTab: string | null;
  readonly activeTerminal: string | null;
  readonly aiMessages: ChatMessage[];
  readonly aiSession: SessionSnapshot | null;
  readonly apiConfigs: ApiConfig[];
  readonly appTheme: AppTheme;
  readonly bottomPanel: BottomPanel;
  readonly bottomPanelVisible: boolean;
  readonly expandedDirs: Set<string>;
  readonly fileTree: DirectoryEntry[];
  readonly gitStatus: string;
  readonly mcpServers: McpServer[];
  readonly openFiles: Map<string, EditorTab>;
  readonly searchLoading: boolean;
  readonly searchQuery: string;
  readonly searchResults: SearchMatch[];
  readonly sidebarVisible: boolean;
  readonly tabs: EditorTab[];
  readonly terminalSessions: SessionSnapshot[];
  readonly workspaceName: string;
  readonly workspaceRoot: string | null;
  addAiMessage(message: ChatMessage): void;
  addTerminalSession(session: SessionSnapshot): void;
  clearAiMessages(): void;
  closeTab(path: string): void;
  markTabDirty(path: string, dirty: boolean): void;
  markTabSaved(path: string, mtimeMs: number): void;
  openFile(entry: DirectoryEntry, content: string, mtimeMs: number): void;
  removeTerminalSession(sessionId: string): void;
  setActiveApiConfig(id: string | null): void;
  setActiveSidebar(panel: SidebarPanel): void;
  setActiveTab(path: string): void;
  setActiveTerminal(sessionId: string): void;
  setAiSession(session: SessionSnapshot | null): void;
  setApiConfigs(configs: ApiConfig[], activeId?: string | null): void;
  setAppTheme(theme: AppTheme): void;
  setBottomPanel(panel: BottomPanel): void;
  setFileTree(entries: DirectoryEntry[]): void;
  setGitStatus(status: string): void;
  setMcpServers(servers: McpServer[]): void;
  setSearchLoading(loading: boolean): void;
  setSearchQuery(query: string): void;
  setSearchResults(results: SearchMatch[]): void;
  setWorkspaceRoot(root: string | null): void;
  toggleBottomPanel(): void;
  toggleDir(path: string): void;
  toggleMcpServer(name: string): void;
  toggleSidebar(): void;
  updateTabContent(path: string, content: string): void;
}
