import type React from "react";
import { Download, ExternalLink } from "lucide-react";
import type { McpMarketplaceServer } from "../../types/nexus";
import { cardStyle, iconButtonStyle, primaryButtonStyle } from "./mcpPanelStyles";

interface McpMarketplaceCardProps {
  readonly listing: McpMarketplaceServer;
  readonly onInstall: (id: string) => void;
}

export function McpMarketplaceCard({ listing, onInstall }: McpMarketplaceCardProps) {
  const link = listing.repositoryUrl ?? listing.marketplaceUrl;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
              {listing.name}
            </span>
            <span style={sourceBadgeStyle}>{listing.source}</span>
            {listing.installed && <span style={installedBadgeStyle}>已安装</span>}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>
            {listing.description || "No description"}
          </div>
          <div style={{ color: "var(--text-muted)", display: "flex", fontSize: 10, gap: 8 }}>
            <span>{listing.category}</span>
            <span>{listing.author}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {link && (
            <button onClick={() => window.open(link, "_blank")} style={iconButtonStyle}>
              <ExternalLink size={10} /> 来源
            </button>
          )}
          <button
            disabled={listing.installed || !listing.installable}
            onClick={() => onInstall(listing.id)}
            style={installButtonStyle(listing)}
            title={listing.installError}
          >
            <Download size={10} /> {listing.installed ? "已安装" : "安装"}
          </button>
        </div>
      </div>
      {!listing.installable && (
        <div style={{ color: "var(--warning)", fontSize: 10, marginTop: 6 }}>
          {listing.installError}
        </div>
      )}
    </div>
  );
}

function installButtonStyle(listing: McpMarketplaceServer): React.CSSProperties {
  return {
    ...primaryButtonStyle,
    cursor: listing.installed || !listing.installable ? "not-allowed" : "pointer",
    opacity: listing.installed || !listing.installable ? 0.55 : 1,
  };
}

const sourceBadgeStyle: React.CSSProperties = {
  background: "rgba(59, 130, 246, 0.12)",
  borderRadius: 10,
  color: "#60a5fa",
  fontSize: 9,
  fontWeight: 500,
  padding: "1px 5px",
};

const installedBadgeStyle: React.CSSProperties = {
  background: "var(--success-bg)",
  borderRadius: 10,
  color: "var(--success)",
  fontSize: 9,
  fontWeight: 500,
  padding: "1px 5px",
};
