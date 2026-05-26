import React from "react";
import { useStore, type SidebarPanel } from "../../store/useStore";
import { Database, Files, Search, GitBranch, ListChecks, ListTree, Server, Package, Sparkles, Settings, Terminal, Workflow } from "lucide-react";

const navItems: { id: SidebarPanel; icon: React.ReactNode; tooltip: string }[] = [
  { id: "files", icon: <Files size={20} />, tooltip: "文件管理器" },
  { id: "search", icon: <Search size={20} />, tooltip: "搜索" },
  { id: "outline", icon: <ListTree size={20} />, tooltip: "符号大纲" },
  { id: "git", icon: <GitBranch size={20} />, tooltip: "版本控制" },
  { id: "tests", icon: <ListChecks size={20} />, tooltip: "测试" },
  { id: "rag", icon: <Database size={20} />, tooltip: "代码库索引" },
  { id: "workflows", icon: <Workflow size={20} />, tooltip: "工作流" },
  { id: "mcp", icon: <Server size={20} />, tooltip: "MCP 服务" },
  { id: "plugins", icon: <Package size={20} />, tooltip: "插件市场" },
  { id: "skills", icon: <Sparkles size={20} />, tooltip: "技能市场" },
  { id: "settings", icon: <Settings size={20} />, tooltip: "设置" },
];

export function SidebarNav() {
  const activeSidebar = useStore((s) => s.activeSidebar);
  const setActiveSidebar = useStore((s) => s.setActiveSidebar);
  const toggleBottomPanel = useStore((s) => s.toggleBottomPanel);
  const bottomPanelVisible = useStore((s) => s.bottomPanelVisible);
  const setBottomPanel = useStore((s) => s.setBottomPanel);

  const handleNavClick = (id: SidebarPanel) => {
    if (activeSidebar === id) {
      setActiveSidebar(null);
    } else {
      setActiveSidebar(id);
    }
  };

  return (
    <>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          title={item.tooltip}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "var(--radius-md)",
            background: activeSidebar === item.id ? "var(--accent-subtle)" : "none",
            border: "none",
            color: activeSidebar === item.id ? "var(--text-accent)" : "var(--text-muted)",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.2s var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            if (activeSidebar !== item.id) {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "var(--bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeSidebar !== item.id) {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "none";
            }
          }}
        >
          {item.icon}
          {activeSidebar === item.id && (
            <div style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 3,
              height: 20,
              background: "var(--gradient-primary)",
              borderRadius: "0 2px 2px 0",
            }} />
          )}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Terminal toggle */}
      <button
        onClick={() => {
          if (!bottomPanelVisible) {
            setBottomPanel("terminal");
          } else {
            toggleBottomPanel();
          }
        }}
        title="终端"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "var(--radius-md)",
          background: bottomPanelVisible ? "var(--accent-subtle)" : "none",
          border: "none",
          color: bottomPanelVisible ? "var(--text-accent)" : "var(--text-muted)",
          cursor: "pointer",
          transition: "all 0.2s var(--ease-out)",
          marginBottom: 8,
        }}
      >
        <Terminal size={20} />
      </button>
    </>
  );
}
