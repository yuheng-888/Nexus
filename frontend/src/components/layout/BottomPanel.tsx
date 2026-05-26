import React from "react";
import { useStore, type BottomPanel as BottomPanelType } from "../../store/useStore";
import { TerminalView } from "../terminal/TerminalView";
import { AiChat } from "../ai/AiChat";
import { ProblemsPanel } from "../editor/ProblemsPanel";
import { AlertCircle, Terminal, Sparkles, X, Plus } from "lucide-react";
import { useLanguageStore } from "../../store/languageStore";

const tabItems: { id: BottomPanelType; label: string; icon: React.ReactNode }[] = [
  { id: "terminal", label: "终端", icon: <Terminal size={13} /> },
  { id: "problems", label: "问题", icon: <AlertCircle size={13} /> },
  { id: "ai", label: "AI 助手", icon: <Sparkles size={13} /> },
];

export function BottomPanel() {
  const bottomPanel = useStore((s) => s.bottomPanel);
  const setBottomPanel = useStore((s) => s.setBottomPanel);
  const toggleBottomPanel = useStore((s) => s.toggleBottomPanel);
  const createTerminal = useStore((s) => s.addTerminalSession);
  const summary = useLanguageStore((s) => s.problemSummary);

  const handleNewTerminal = async () => {
    try {
      const session = await window.nexus.terminal.create({ cols: 80, rows: 24 });
      createTerminal(session);
    } catch (err) {
      console.error("Failed to create terminal:", err);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-panel)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 34,
        minHeight: 34,
        padding: "0 8px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%" }}>
          {tabItems.map((item) => (
            <button
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 12px",
                height: "100%",
                fontSize: 12,
                color: bottomPanel === item.id ? "var(--text-active)" : "var(--text-muted)",
                cursor: "pointer",
                borderBottom: bottomPanel === item.id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
                border: "none",
                fontFamily: "inherit",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onClick={() => setBottomPanel(item.id)}
            >
              {item.icon}
              {item.label}
              {item.id === "problems" && summary.total > 0 && (
                <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {summary.total}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {bottomPanel === "terminal" && (
            <button
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "var(--radius-sm)",
                background: "none", border: "none",
                color: "var(--text-muted)", cursor: "pointer",
              }}
              onClick={handleNewTerminal}
              title="新建终端"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "var(--radius-sm)",
              background: "none", border: "none",
              color: "var(--text-muted)", cursor: "pointer",
            }}
            onClick={toggleBottomPanel}
            title="关闭面板"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {bottomPanel === "terminal" && <TerminalView />}
        {bottomPanel === "problems" && <ProblemsPanel />}
        {bottomPanel === "ai" && <AiChat />}
      </div>
    </div>
  );
}
