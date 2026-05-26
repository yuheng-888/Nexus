import React, { useCallback, useState } from "react";
import { useStore } from "../../store/useStore";
import { MonacoEditor } from "./MonacoEditor";
import { X, Circle, Code } from "lucide-react";
import { saveEditorTab } from "./editorSave";

export function EditorArea() {
  const tabs = useStore((s) => s.tabs);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);
  const updateTabContent = useStore((s) => s.updateTabContent);
  const markTabSaved = useStore((s) => s.markTabSaved);
  const [saveError, setSaveError] = useState("");

  const currentTab = tabs.find((t) => t.path === activeTab);

  const handleSave = useCallback(async (content: string) => {
    if (currentTab === undefined) return;
    setSaveError("");
    try {
      await saveEditorTab({
        content,
        markSaved: markTabSaved,
        path: currentTab.path,
        write: window.nexus.file.write,
        writeAbsolute: window.nexus.file.writeAbsolute
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [currentTab, markTabSaved]);

  const getFileColor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    const colors: Record<string, string> = {
      ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
      json: "#fbbf24", md: "#60a5fa", css: "#a78bfa", html: "#f87171",
    };
    return colors[ext ?? ""] ?? "#9899b3";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-primary)" }}>
      {tabs.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", height: 36, minHeight: 36,
          background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)",
          overflow: "auto", flexShrink: 0,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.path}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: "100%", padding: "0 14px",
                fontSize: 12, cursor: "pointer",
                color: tab.path === activeTab ? "var(--text-active)" : "var(--text-muted)",
                background: tab.path === activeTab ? "var(--bg-primary)" : "transparent",
                border: "none", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                borderBottom: tab.path === activeTab ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.15s",
                position: "relative",
              }}
              onClick={() => setActiveTab(tab.path)}
            >
              {tab.dirty && (
                <Circle size={7} fill="var(--warning)" color="var(--warning)" />
              )}
              <span style={{ color: getFileColor(tab.name) }}>●</span>
              <span>{tab.name}</span>
              <span
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 18, height: 18, borderRadius: "var(--radius-sm)",
                  background: "none", border: "none",
                  color: "var(--text-muted)", cursor: "pointer",
                  opacity: tab.path === activeTab ? 1 : 0,
                  transition: "opacity 0.1s, color 0.1s",
                }}
                onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <X size={13} />
              </span>
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {currentTab ? (
          <MonacoEditor
            key={currentTab.path}
            value={currentTab.content}
            language={getLanguage(currentTab.name)}
            onChange={(value: string | undefined) => updateTabContent(currentTab.path, value ?? "")}
            onSave={handleSave}
            path={currentTab.path}
          />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", color: "var(--text-muted)", gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "var(--radius-lg)",
              background: "var(--accent-subtle)", border: "1px solid var(--border-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Code size={28} color="var(--text-accent)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>Nexus IDE</span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              从文件管理器打开文件开始编辑
            </span>
            <div style={{
              display: "flex", gap: 12, marginTop: 8, fontSize: 11,
            }}>
              <span style={{ padding: "3px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                ⌘ + P 快速打开
              </span>
              <span style={{ padding: "3px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                ⌘ + S 保存文件
              </span>
            </div>
          </div>
        )}
        {saveError !== "" && <SaveError message={saveError} />}
      </div>
    </div>
  );
}

function SaveError({ message }: { readonly message: string }) {
  return (
    <div style={{
      background: "var(--error-bg)",
      border: "1px solid var(--error)",
      borderRadius: "var(--radius-sm)",
      bottom: 12,
      color: "var(--error)",
      fontSize: 12,
      maxWidth: 520,
      padding: "8px 10px",
      position: "absolute",
      right: 12,
      zIndex: 20
    }}>
      保存失败: {message}
    </div>
  );
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", html: "html", htm: "html", css: "css", scss: "scss",
    less: "less", md: "markdown", py: "python", rb: "ruby", go: "go",
    rs: "rust", java: "java", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    sh: "shell", bash: "shell", zsh: "shell", yaml: "yaml", yml: "yaml",
    toml: "toml", xml: "xml", sql: "sql", graphql: "graphql",
    dockerfile: "dockerfile",
  };
  return map[ext] ?? "plaintext";
}
