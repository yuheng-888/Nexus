import type React from "react";
import type { ApiProvider } from "../../types/nexus";

export const PROVIDER_ICONS: Record<ApiProvider, string> = {
  anthropic: "🟣",
  custom: "⚡",
  deepseek: "🟠",
  google: "🔵",
  openai: "🟢"
};

export const PROVIDER_COLORS: Record<ApiProvider, string> = {
  anthropic: "#8b5cf6",
  custom: "#ec4899",
  deepseek: "#f59e0b",
  google: "#3b82f6",
  openai: "#10b981"
};

export const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 12,
  height: 28,
  outline: "none",
  padding: "0 8px",
  width: "100%"
};

export const labelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  display: "block",
  fontSize: 11,
  marginBottom: 3
};

export const primaryBtn: React.CSSProperties = {
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  color: "white",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 14px"
};

export const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  marginTop: 6,
  padding: "4px 14px"
};
