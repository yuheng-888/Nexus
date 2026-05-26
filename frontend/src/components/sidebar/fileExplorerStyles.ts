import type React from "react";

export const emptyPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "32px 18px"
};

export const errorStyle: React.CSSProperties = {
  color: "var(--error)",
  fontSize: 12,
  lineHeight: 1.5
};

export const explorerRootStyle: React.CSSProperties = {
  fontSize: 13,
  userSelect: "none"
};

export const emptyTreeStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "20px 16px",
  textAlign: "center"
};

export const iconCellStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  height: 16,
  justifyContent: "center",
  width: 16
};

export const primaryButtonStyle: React.CSSProperties = {
  background: "var(--accent-subtle)",
  border: "1px solid var(--border-accent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  height: 32
};

export const recentButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  font: "inherit",
  minHeight: 38,
  padding: "7px 9px",
  textAlign: "left"
};

export const recentPathStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  display: "block",
  fontSize: 10,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const recentTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const refreshBarStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "flex-end",
  padding: "2px 10px 4px"
};

export const sectionLabelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600
};

export const treeNameStyle: React.CSSProperties = {
  fontSize: 12.5,
  overflow: "hidden",
  textOverflow: "ellipsis"
};

export function refreshButtonStyle(hovered: boolean): React.CSSProperties {
  return {
    alignItems: "center",
    background: "none",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: hovered ? "var(--text-accent)" : "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    height: 22,
    justifyContent: "center",
    transition: "all 0.15s",
    width: 22
  };
}

export function treeRowStyle(options: {
  readonly depth: number;
  readonly hovered: boolean;
  readonly isActive: boolean;
}): React.CSSProperties {
  return {
    alignItems: "center",
    background: treeRowBackground(options),
    borderRadius: options.isActive ? "var(--radius-sm)" : 0,
    cursor: "pointer",
    display: "flex",
    gap: 5,
    height: 26,
    margin: options.isActive ? "0 4px" : 0,
    overflow: "hidden",
    paddingLeft: 12 + options.depth * 16,
    paddingRight: 8,
    textOverflow: "ellipsis",
    transition: "all 0.1s",
    whiteSpace: "nowrap"
  };
}

function treeRowBackground(options: {
  readonly hovered: boolean;
  readonly isActive: boolean;
}): string {
  if (options.isActive) return "var(--bg-active)";
  if (options.hovered) return "var(--bg-hover)";

  return "transparent";
}
