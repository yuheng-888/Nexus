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

export const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px"
};

export const rowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  justifyContent: "space-between"
};

export const titleStyle: React.CSSProperties = {
  color: "var(--text-active)",
  fontSize: 13,
  fontWeight: 600
};

export const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  lineHeight: 1.5
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
  padding: "4px 9px"
};

export const iconButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-muted)",
  padding: "4px 7px"
};

export const resultButtonStyle: React.CSSProperties = {
  ...cardStyle,
  cursor: "pointer",
  display: "block",
  fontFamily: "inherit",
  textAlign: "left",
  width: "100%"
};

export const errorStyle: React.CSSProperties = {
  border: "1px solid var(--error)",
  borderRadius: "var(--radius-sm)",
  color: "var(--error)",
  fontSize: 11,
  lineHeight: 1.5,
  padding: "7px 8px"
};

export const emptyStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "20px 10px",
  textAlign: "center"
};
