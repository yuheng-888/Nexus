import type React from "react";

export const panelStyle: React.CSSProperties = {
  animation: "fadeIn 0.3s var(--ease-out)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "0 8px 12px"
};

export const headerStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-secondary)",
  display: "flex",
  fontSize: 12,
  justifyContent: "space-between",
  padding: "0 4px 2px"
};

export const iconButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  height: 24,
  justifyContent: "center",
  width: 24
};

export const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px"
};

export const selectedCardStyle: React.CSSProperties = {
  ...cardStyle,
  borderColor: "var(--border-accent)"
};

export const sectionTitleStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
  marginTop: 6,
  textTransform: "uppercase"
};

export const titleStyle: React.CSSProperties = {
  color: "var(--text-active)",
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  lineHeight: 1.4
};

export const descriptionStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.5,
  marginTop: 6
};

export const badgeStyle: React.CSSProperties = {
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  fontSize: 10,
  padding: "1px 6px"
};

export const runButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  cursor: "pointer",
  display: "flex",
  fontFamily: "inherit",
  fontSize: 11,
  gap: 4,
  padding: "4px 8px"
};

export const actionRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8
};

export const dangerButtonStyle: React.CSSProperties = {
  ...runButtonStyle,
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--error)"
};

export const secondaryButtonStyle: React.CSSProperties = {
  ...runButtonStyle,
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-muted)"
};

export const editorGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

export const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 12,
  height: 30,
  outline: "none",
  padding: "0 8px",
  width: "100%"
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 72,
  lineHeight: 1.5,
  padding: 8,
  resize: "vertical"
};

export const codeTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  fontFamily: "var(--font-mono)",
  height: 180,
  whiteSpace: "pre"
};

export const mutedBlockStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "20px 10px",
  textAlign: "center"
};

export const messageStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: 11,
  lineHeight: 1.5,
  padding: "7px 8px"
};

export const errorStyle: React.CSSProperties = {
  ...messageStyle,
  color: "var(--error)"
};

export const outputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  marginTop: 6,
  maxHeight: 120,
  overflow: "auto",
  padding: 8,
  whiteSpace: "pre-wrap"
};
