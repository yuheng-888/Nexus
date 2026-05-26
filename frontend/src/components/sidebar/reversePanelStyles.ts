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
  gap: 8,
  justifyContent: "space-between",
  padding: "0 4px 2px"
};

export const sectionStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  display: "grid",
  gap: 8,
  padding: "10px 12px"
};

export const sectionTitleStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-active)",
  display: "flex",
  fontSize: 12,
  fontWeight: 600,
  gap: 6
};

export const rowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};

export const splitRowStyle: React.CSSProperties = {
  alignItems: "flex-start",
  display: "flex",
  gap: 8,
  justifyContent: "space-between"
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
  height: 58,
  lineHeight: 1.5,
  padding: 8,
  resize: "vertical"
};

export const primaryButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  cursor: "pointer",
  display: "flex",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 500,
  gap: 4,
  minHeight: 26,
  padding: "4px 8px"
};

export const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-muted)"
};

export const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  color: "var(--error)"
};

export const iconButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  justifyContent: "center",
  minHeight: 24,
  padding: 4,
  width: 26
};

export const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  lineHeight: 1.45,
  overflowWrap: "anywhere"
};

export const titleStyle: React.CSSProperties = {
  color: "var(--text-active)",
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const badgeStyle: React.CSSProperties = {
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  fontSize: 10,
  padding: "1px 6px",
  whiteSpace: "nowrap"
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
  borderColor: "var(--error)",
  color: "var(--error)"
};

export const emptyStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "18px 10px",
  textAlign: "center"
};

export const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 6
};

export const findingStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  display: "grid",
  gap: 4,
  padding: "7px 8px"
};
