import type React from "react";

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
  width: "100%",
};

export const iconButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  fontFamily: "inherit",
  fontSize: 10,
  gap: 3,
  padding: "3px 8px",
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
  padding: "4px 10px",
};

export const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  margin: "0 8px 6px",
  padding: "10px 12px",
};

export const sectionTitleStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
  margin: "12px 12px 8px",
  textTransform: "uppercase",
};
