import { create } from "zustand";
import type { EditorTab, NexusState } from "./storeTypes";

export type {
  BottomPanel,
  ChatMessage,
  EditorTab,
  McpServer,
  NexusState,
  SidebarPanel
} from "./storeTypes";

export const useStore = create<NexusState>((set, get) => ({
  // Workspace
  workspaceRoot: null,
  workspaceName: "Nexus",

  // Sidebar
  activeSidebar: "files",
  sidebarVisible: true,

  // File tree
  fileTree: [],
  expandedDirs: new Set<string>(),

  // Editor
  tabs: [],
  activeTab: null,
  openFiles: new Map(),

  // Search
  searchQuery: "",
  searchResults: [],
  searchLoading: false,

  // Git
  gitStatus: "",

  // Terminal
  terminalSessions: [],
  activeTerminal: null,

  // AI
  aiSession: null,
  aiMessages: [],

  // MCP
  mcpServers: [
    { name: "filesystem", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], env: {} as Record<string, string>, enabled: true },
    { name: "github", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], env: { GITHUB_TOKEN: "" } as Record<string, string>, enabled: false },
  ],

  // API Config
  apiConfigs: [],
  activeApiConfig: null,
  appTheme: "nexus",

  // Bottom panel
  bottomPanel: "terminal",
  bottomPanelVisible: true,

  // Actions
  setWorkspaceRoot: (root) =>
    set({
      activeTab: null,
      expandedDirs: new Set<string>(),
      fileTree: [],
      openFiles: new Map(),
      tabs: [],
      workspaceName: root === null ? "Nexus" : root.split("/").pop() ?? "Nexus",
      workspaceRoot: root,
    }),

  setActiveSidebar: (panel) =>
    set((s) => ({
      activeSidebar: panel,
      sidebarVisible: panel !== null ? true : s.sidebarVisible,
    })),

  toggleSidebar: () =>
    set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  setFileTree: (entries) => set({ fileTree: entries }),

  toggleDir: (path) =>
    set((s) => {
      const next = new Set(s.expandedDirs);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedDirs: next };
    }),

  openFile: (entry, content, mtimeMs) => {
    const tab: EditorTab = {
      path: entry.path,
      name: entry.name,
      content,
      dirty: false,
      absolutePath: entry.absolutePath,
      mtimeMs,
    };
    set((s) => {
      const exists = s.openFiles.get(entry.path);
      if (exists) {
        return { activeTab: entry.path };
      }
      const nextMap = new Map(s.openFiles);
      nextMap.set(entry.path, tab);
      return {
        tabs: [...s.tabs, tab],
        activeTab: entry.path,
        openFiles: nextMap,
      };
    });
  },

  closeTab: (path) =>
    set((s) => {
      const nextMap = new Map(s.openFiles);
      nextMap.delete(path);
      const nextTabs = s.tabs.filter((t) => t.path !== path);
      let nextActive = s.activeTab;
      if (s.activeTab === path) {
        const idx = s.tabs.findIndex((t) => t.path === path);
        nextActive =
          nextTabs.length > 0
            ? nextTabs[Math.min(idx, nextTabs.length - 1)]?.path ?? null
            : null;
      }
      return { tabs: nextTabs, activeTab: nextActive, openFiles: nextMap };
    }),

  setActiveTab: (path) => set({ activeTab: path }),

  updateTabContent: (path, content) =>
    set((s) => {
      const nextMap = new Map(s.openFiles);
      const existing = nextMap.get(path);
      if (existing) {
        nextMap.set(path, { ...existing, content, dirty: true });
      }
      return {
        tabs: s.tabs.map((t) =>
          t.path === path ? { ...t, content, dirty: true } : t
        ),
        openFiles: nextMap,
      };
    }),

  markTabDirty: (path, dirty) =>
    set((s) => {
      const nextMap = new Map(s.openFiles);
      const existing = nextMap.get(path);
      if (existing) {
        nextMap.set(path, { ...existing, dirty });
      }
      return {
        tabs: s.tabs.map((t) =>
          t.path === path ? { ...t, dirty } : t
        ),
        openFiles: nextMap,
      };
    }),

  markTabSaved: (path, mtimeMs) =>
    set((s) => {
      const nextMap = new Map(s.openFiles);
      const existing = nextMap.get(path);
      if (existing) {
        nextMap.set(path, { ...existing, dirty: false, mtimeMs });
      }
      return {
        tabs: s.tabs.map((t) =>
          t.path === path ? { ...t, dirty: false, mtimeMs } : t
        ),
        openFiles: nextMap,
      };
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  setGitStatus: (status) => set({ gitStatus: status }),

  addTerminalSession: (session) =>
    set((s) => ({
      terminalSessions: [...s.terminalSessions, session],
      activeTerminal: session.id,
    })),

  removeTerminalSession: (sessionId) =>
    set((s) => {
      const next = s.terminalSessions.filter((t) => t.id !== sessionId);
      return {
        terminalSessions: next,
        activeTerminal:
          s.activeTerminal === sessionId
            ? next[next.length - 1]?.id ?? null
            : s.activeTerminal,
      };
    }),

  setActiveTerminal: (sessionId) => set({ activeTerminal: sessionId }),
  setAiSession: (session) => set({ aiSession: session }),
  addAiMessage: (message) =>
    set((s) => ({ aiMessages: [...s.aiMessages, message] })),
  clearAiMessages: () => set({ aiMessages: [] }),

  setMcpServers: (servers) => set({ mcpServers: servers }),
  toggleMcpServer: (name) =>
    set((s) => ({
      mcpServers: s.mcpServers.map((srv) =>
        srv.name === name ? { ...srv, enabled: !srv.enabled } : srv
      ),
    })),

  setApiConfigs: (configs, activeId) =>
    set((s) => ({
      apiConfigs: configs,
      activeApiConfig: activeId !== undefined ? activeId : s.activeApiConfig,
    })),
  setActiveApiConfig: (id) => set({ activeApiConfig: id }),
  setAppTheme: (theme) => set({ appTheme: theme }),

  setBottomPanel: (panel) =>
    set((s) => ({ bottomPanel: panel, bottomPanelVisible: panel !== null })),

  toggleBottomPanel: () =>
    set((s) => ({ bottomPanelVisible: !s.bottomPanelVisible })),
}));
