import type React from "react";

export const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  height: "100%",
  minHeight: 0,
  padding: "0 8px 10px"
};

export const headerStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-secondary)",
  display: "flex",
  gap: 8,
  justifyContent: "space-between",
  padding: "0 4px"
};

export const bodyStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  flexDirection: "column",
  gap: 8,
  minHeight: 0,
  overflow: "auto"
};

export const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "9px 10px"
};

export const sectionTitleStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
  margin: "2px 0 6px",
  textTransform: "uppercase"
};

export const rowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 6,
  minWidth: 0
};

export const stackStyle: React.CSSProperties = {
  display: "grid",
  gap: 6
};

export const branchStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  display: "flex",
  gap: 6,
  minWidth: 0,
  padding: "4px 8px"
};

export const branchTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  maxWidth: 140,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const titleStyle: React.CSSProperties = {
  color: "var(--text-active)",
  flex: 1,
  fontSize: 12,
  fontWeight: 600,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const metaPillStyle: React.CSSProperties = {
  background: "var(--bg-badge)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: 10,
  padding: "1px 5px"
};

export const iconButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  height: 26,
  justifyContent: "center",
  minWidth: 26,
  padding: 0
};

export const buttonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 11,
  gap: 4,
  height: 26,
  justifyContent: "center",
  padding: "0 8px"
};

export const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  color: "var(--text-accent)"
};

export const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  color: "var(--error)"
};

export const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 12,
  height: 28,
  minWidth: 0,
  outline: "none",
  padding: "0 8px",
  width: "100%"
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 52,
  lineHeight: 1.45,
  padding: 7,
  resize: "vertical"
};

export const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 4
};

export const fileButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "transparent",
  color: "var(--text-primary)",
  flex: 1,
  justifyContent: "flex-start",
  minWidth: 0,
  padding: "0 6px"
};

export const pathStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const outputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  lineHeight: 1.45,
  margin: 0,
  maxHeight: 150,
  overflow: "auto",
  padding: 8,
  whiteSpace: "pre-wrap"
};

export const diffStyle: React.CSSProperties = {
  ...outputStyle,
  maxHeight: 240
};

export const emptyStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "18px 10px",
  textAlign: "center"
};

export const errorStyle: React.CSSProperties = {
  alignItems: "center",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--error)",
  display: "flex",
  fontSize: 11,
  gap: 6,
  padding: "7px 8px"
};
