import React from "react";
import { useStore } from "../../store/useStore";
import { FileExplorer } from "./FileExplorer";
import { SearchPanel } from "./SearchPanel";
import { OutlinePanel } from "./OutlinePanel";
import { GitPanel } from "./GitPanel";
import { RagPanel } from "./RagPanel";
import { WorkflowPanel } from "./WorkflowPanel";
import { McpPanel } from "./McpPanel";
import { PluginsPanel } from "./PluginsPanel";
import { SkillsPanel } from "./SkillsPanel";
import { SettingsView } from "./SettingsView";

export function SidebarContent() {
  const activeSidebar = useStore((s) => s.activeSidebar);

  const titles: Record<string, string> = {
    files: "文件管理器",
    search: "搜索",
    outline: "符号大纲",
    git: "版本控制",
    rag: "代码库索引",
    workflows: "工作流",
    mcp: "MCP 服务",
    plugins: "插件市场",
    skills: "技能市场",
    settings: "设置",
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-sidebar)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 14px 20px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--text-accent)",
        flexShrink: 0,
      }}>
        <span>{titles[activeSidebar ?? ""] ?? ""}</span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSidebar === "files" && <FileExplorer />}
        {activeSidebar === "search" && <SearchPanel />}
        {activeSidebar === "outline" && <OutlinePanel />}
        {activeSidebar === "git" && <GitPanel />}
        {activeSidebar === "rag" && <RagPanel />}
        {activeSidebar === "workflows" && <WorkflowPanel />}
        {activeSidebar === "mcp" && <McpPanel />}
        {activeSidebar === "plugins" && <PluginsPanel />}
        {activeSidebar === "skills" && <SkillsPanel />}
        {activeSidebar === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
