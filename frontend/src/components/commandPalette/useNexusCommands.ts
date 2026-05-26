import { useMemo } from "react";
import { useLanguageStore } from "../../store/languageStore";
import { useStore, type BottomPanel, type SidebarPanel } from "../../store/useStore";
import type { WorkspaceInfo } from "../../types/nexus";
import type { CommandPaletteItem } from "./commandPaletteModel";

interface CommandPaletteActions {
  readonly onClose: () => void;
  readonly onOpenQuickOpen: () => void;
  readonly onSetError: (error: string) => void;
}

interface CommandDraft {
  readonly category: string;
  readonly id: string;
  readonly keywords: readonly string[];
  readonly run: () => Promise<void> | void;
  readonly shortcut?: string;
  readonly title: string;
}

interface SidebarCommandDraft {
  readonly category: string;
  readonly id: string;
  readonly keywords: readonly string[];
  readonly panel: SidebarPanel;
  readonly setActiveSidebar: (panel: SidebarPanel) => void;
  readonly title: string;
}

interface BottomPanelCommandDraft {
  readonly id: string;
  readonly keywords: readonly string[];
  readonly panel: BottomPanel;
  readonly setBottomPanel: (panel: BottomPanel) => void;
  readonly title: string;
}

export function useNexusCommands(actions: CommandPaletteActions): readonly CommandPaletteItem[] {
  const setActiveSidebar = useStore((state) => state.setActiveSidebar);
  const setBottomPanel = useStore((state) => state.setBottomPanel);
  const setWorkspaceRoot = useStore((state) => state.setWorkspaceRoot);
  const clearLanguageState = useLanguageStore((state) => state.clearLanguageState);

  return useMemo(() => [
    ...workspaceCommands({ actions, clearLanguageState, setWorkspaceRoot }),
    ...sidebarCommands(setActiveSidebar),
    ...bottomPanelCommands(setBottomPanel),
    ...aiCommands(actions),
    command({
      category: "视图",
      id: "commands.show",
      keywords: ["command", "palette"],
      run: () => undefined,
      shortcut: "Cmd Shift P",
      title: "显示命令面板"
    })
  ], [actions, clearLanguageState, setActiveSidebar, setBottomPanel, setWorkspaceRoot]);
}

function workspaceCommands(options: {
  readonly actions: CommandPaletteActions;
  readonly clearLanguageState: () => void;
  readonly setWorkspaceRoot: (root: string | null) => void;
}): readonly CommandPaletteItem[] {
  return [
    command({
      category: "文件",
      id: "files.open",
      keywords: ["folder", "workspace", "project"],
      run: async () => {
        const info = await window.nexus.workspace.open();
        if (isWorkspaceOpen(info)) {
          options.clearLanguageState();
          options.setWorkspaceRoot(info.root);
        }
      },
      title: "打开项目"
    }),
    command({
      category: "文件",
      id: "files.quickOpen",
      keywords: ["file", "search", "go to file"],
      run: () => {
        options.actions.onClose();
        options.actions.onOpenQuickOpen();
      },
      shortcut: "Cmd P",
      title: "快速打开文件"
    })
  ];
}

function sidebarCommands(setActiveSidebar: (panel: SidebarPanel) => void): readonly CommandPaletteItem[] {
  return [
    sidebarCommand({ category: "视图", id: "sidebar.files", keywords: ["explorer"], panel: "files", setActiveSidebar, title: "显示文件管理器" }),
    sidebarCommand({ category: "视图", id: "sidebar.search", keywords: ["find"], panel: "search", setActiveSidebar, title: "显示搜索" }),
    sidebarCommand({ category: "Git", id: "sidebar.git", keywords: ["source control"], panel: "git", setActiveSidebar, title: "显示版本控制" }),
    sidebarCommand({ category: "测试", id: "sidebar.tests", keywords: ["test", "vitest", "npm"], panel: "tests", setActiveSidebar, title: "显示测试" }),
    sidebarCommand({ category: "AI", id: "sidebar.rag", keywords: ["rag", "index", "代码库"], panel: "rag", setActiveSidebar, title: "显示代码库索引" }),
    sidebarCommand({ category: "工作流", id: "sidebar.workflows", keywords: ["macro", "automation"], panel: "workflows", setActiveSidebar, title: "显示工作流" }),
    sidebarCommand({ category: "MCP", id: "sidebar.mcp", keywords: ["server"], panel: "mcp", setActiveSidebar, title: "显示 MCP 服务" }),
    sidebarCommand({ category: "插件", id: "sidebar.plugins", keywords: ["extension", "marketplace"], panel: "plugins", setActiveSidebar, title: "显示插件市场" }),
    sidebarCommand({ category: "技能", id: "sidebar.skills", keywords: ["skill"], panel: "skills", setActiveSidebar, title: "显示技能市场" }),
    sidebarCommand({ category: "设置", id: "sidebar.settings", keywords: ["config"], panel: "settings", setActiveSidebar, title: "打开设置" })
  ];
}

function bottomPanelCommands(setBottomPanel: (panel: BottomPanel) => void): readonly CommandPaletteItem[] {
  return [
    bottomPanelCommand({ id: "bottom.terminal", keywords: ["shell"], panel: "terminal", setBottomPanel, title: "显示终端" }),
    bottomPanelCommand({ id: "bottom.problems", keywords: ["diagnostics"], panel: "problems", setBottomPanel, title: "显示问题面板" }),
    bottomPanelCommand({ id: "bottom.ai", keywords: ["chat", "assistant"], panel: "ai", setBottomPanel, title: "显示 AI 助手" })
  ];
}

function aiCommands(actions: CommandPaletteActions): readonly CommandPaletteItem[] {
  return [
    command({
      category: "AI",
      id: "rag.build",
      keywords: ["rag", "index", "代码库"],
      run: async () => {
        actions.onSetError("");
        await window.nexus.rag.index.build();
      },
      title: "构建代码库索引"
    })
  ];
}

function command(draft: CommandDraft): CommandPaletteItem {
  return { ...draft };
}

function sidebarCommand(draft: SidebarCommandDraft): CommandPaletteItem {
  return command({
    category: draft.category,
    id: draft.id,
    keywords: draft.keywords,
    run: () => draft.setActiveSidebar(draft.panel),
    title: draft.title
  });
}

function bottomPanelCommand(draft: BottomPanelCommandDraft): CommandPaletteItem {
  return command({
    category: "视图",
    id: draft.id,
    keywords: draft.keywords,
    run: () => draft.setBottomPanel(draft.panel),
    title: draft.title
  });
}

function isWorkspaceOpen(info: WorkspaceInfo | null | undefined): info is WorkspaceInfo {
  return info?.root !== undefined && info.root !== null;
}
