import type React from "react";

export const headerWrapStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  marginBottom: 4,
  padding: "8px 12px"
};

export const addButtonStyle: React.CSSProperties = {
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
  padding: "4px 10px"
};

export const addPanelStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-md)",
  margin: "0 8px 8px",
  padding: 12
};

export const providerButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  cursor: "pointer",
  display: "flex",
  fontFamily: "inherit",
  fontSize: 12,
  gap: 10,
  padding: "8px 10px",
  textAlign: "left",
  transition: "all 0.15s"
};

export const messageStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: 11,
  margin: "0 12px 8px",
  padding: "6px 8px"
};

export const sectionTitleStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-secondary)",
  display: "flex",
  fontSize: 12,
  gap: 6,
  marginBottom: 8
};

export const generalBoxStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px"
};

export const compactSettingStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10
};

export const switchStyle: React.CSSProperties = {
  background: "var(--accent)",
  borderRadius: 10,
  cursor: "pointer",
  height: 20,
  position: "relative",
  transition: "background 0.2s",
  width: 36
};

export const switchKnobStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "50%",
  height: 16,
  position: "absolute",
  right: 2,
  top: 2,
  transition: "all 0.2s",
  width: 16
};

export const aboutStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "12px",
  textAlign: "center"
};

export const brandStyle: React.CSSProperties = {
  background: "var(--gradient-primary)",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 4,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};
