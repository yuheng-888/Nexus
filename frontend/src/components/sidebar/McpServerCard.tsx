import type React from "react";
import { ExternalLink, Play, Square, Trash2 } from "lucide-react";
import type { McpServer } from "../../types/nexus";
import { cardStyle, iconButtonStyle } from "./mcpPanelStyles";

interface McpServerCardProps {
  readonly onRemove: (name: string) => void;
  readonly onToggle: (name: string) => void;
  readonly server: McpServer;
}

export function McpServerCard({ onRemove, onToggle, server }: McpServerCardProps) {
  const link = server.repositoryUrl ?? server.marketplaceUrl;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={statusDotStyle(server.enabled)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
              {server.name}
            </span>
            <span style={badgeStyle}>{server.source}</span>
          </div>
          {server.description && (
            <div style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>
              {server.description}
            </div>
          )}
          <div style={commandStyle}>{formatServerCommand(server)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {link && (
            <button onClick={() => window.open(link, "_blank")} style={iconButtonStyle} title="打开来源">
              <ExternalLink size={10} /> 来源
            </button>
          )}
          <button onClick={() => onToggle(server.name)} style={iconButtonStyle}>
            {server.enabled ? <Square size={10} /> : <Play size={10} />}
            {server.enabled ? "停用" : "启用"}
          </button>
          <button onClick={() => onRemove(server.name)} style={iconButtonStyle}>
            <Trash2 size={10} /> 删除
          </button>
        </div>
      </div>
    </div>
  );
}

function formatServerCommand(server: McpServer): string {
  if (server.command !== undefined) return `${server.command} ${server.args.join(" ")}`.trim();
  return server.url ?? "(missing command/url)";
}

function statusDotStyle(enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? "var(--success)" : "var(--text-muted)",
    borderRadius: "50%",
    boxShadow: enabled ? "0 0 8px var(--success)" : "none",
    flexShrink: 0,
    height: 8,
    marginTop: 5,
    width: 8,
  };
}

const badgeStyle: React.CSSProperties = {
  background: "var(--bg-badge)",
  borderRadius: 10,
  color: "var(--text-accent)",
  fontSize: 9,
  fontWeight: 500,
  padding: "1px 5px",
};

const commandStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-accent)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  overflow: "hidden",
  padding: "4px 6px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
