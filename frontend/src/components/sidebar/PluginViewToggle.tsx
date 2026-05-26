import React from "react";

export type PluginViewMode = "installed" | "marketplace";

interface PluginViewToggleProps {
  readonly mode: PluginViewMode;
  readonly onToggle: () => void;
}

export function PluginViewToggle({ mode, onToggle }: PluginViewToggleProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: mode === "installed" ? "var(--accent-subtle)" : "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        color: mode === "installed" ? "var(--text-accent)" : "var(--text-muted)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 11,
        padding: "0 9px",
        whiteSpace: "nowrap"
      }}
    >
      {mode === "installed" ? "已安装" : "市场"}
    </button>
  );
}
