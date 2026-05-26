import type React from "react";
import { useEffect, useState } from "react";
import { Plus, Search, Server } from "lucide-react";
import type { InstallResult, McpMarketplaceServer, McpMarketplaceSource, McpServer } from "../../types/nexus";
import { McpMarketplaceCard } from "./McpMarketplaceCard";
import { McpServerCard } from "./McpServerCard";
import { inputStyle, primaryButtonStyle, sectionTitleStyle } from "./mcpPanelStyles";

const SEARCH_DELAY_MS = 350;

export function McpPanel() {
  const [servers, setServers] = useState<readonly McpServer[]>([]);
  const [listings, setListings] = useState<readonly McpMarketplaceServer[]>([]);
  const [search, setSearch] = useState("chrome");
  const [source, setSource] = useState<McpMarketplaceSource>("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ args: "", command: "", name: "" });

  useEffect(() => {
    void loadServers();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void searchMarketplace(), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search, source]);

  const loadServers = async () => {
    setServers(await window.nexus.mcp.list());
  };

  const searchMarketplace = async () => {
    setLoading(true);
    setMessage("");
    try {
      setListings(await window.nexus.mcp.search({ query: search, source }));
    } catch (error) {
      setMessage(toMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: () => Promise<InstallResult>) => {
    try {
      const result = await action();
      setMessage(result.message);
      await loadServers();
      await searchMarketplace();
    } catch (error) {
      setMessage(toMessage(error));
    }
  };

  const addManualServer = async () => {
    if (draft.name.trim() === "" || draft.command.trim() === "") return;
    await runAction(() => window.nexus.mcp.add({
      args: splitArgs(draft.args),
      command: draft.command.trim(),
      env: {},
      name: draft.name.trim(),
      type: "stdio"
    }));
    setDraft({ args: "", command: "", name: "" });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: "0 4px", animation: "fadeIn 0.3s var(--ease-out)" }}>
      <div style={headerStyle}>
        <span>{servers.length} 个 MCP 服务</span>
        <button onClick={() => setShowAdd(!showAdd)} style={primaryButtonStyle}>
          <Plus size={12} /> 添加服务
        </button>
      </div>
      {showAdd && renderAddForm(draft, setDraft, addManualServer)}
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} style={searchIconStyle} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索 Glama / MCP.so..."
            style={{ ...inputStyle, paddingLeft: 28 }}
            value={search}
          />
        </div>
        <select onChange={(event) => setSource(event.target.value as McpMarketplaceSource)} style={selectStyle} value={source}>
          <option value="all">全部</option>
          <option value="glama">Glama</option>
          <option value="mcp.so">MCP.so</option>
        </select>
      </div>
      {message && <div style={messageStyle}>{message}</div>}
      <div style={sectionTitleStyle}>市场</div>
      {renderMarketplace(listings, loading, (id) => runAction(() => window.nexus.mcp.install(id)))}
      <div style={sectionTitleStyle}>已安装</div>
      {renderServers(servers, runAction)}
    </div>
  );
}

function renderAddForm(
  draft: { readonly args: string; readonly command: string; readonly name: string },
  setDraft: (draft: { readonly args: string; readonly command: string; readonly name: string }) => void,
  onAdd: () => void
) {
  return (
    <div style={addFormStyle}>
      <input placeholder="服务名称" style={inputStyle} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <input placeholder="命令，例如 npx" style={inputStyle} value={draft.command} onChange={(event) => setDraft({ ...draft, command: event.target.value })} />
      <input placeholder="参数，空格分隔" style={inputStyle} value={draft.args} onChange={(event) => setDraft({ ...draft, args: event.target.value })} />
      <button onClick={onAdd} style={primaryButtonStyle}>添加</button>
    </div>
  );
}

function renderMarketplace(
  listings: readonly McpMarketplaceServer[],
  loading: boolean,
  onInstall: (id: string) => void
) {
  if (loading) return <EmptyState text="加载 MCP 市场..." />;
  if (listings.length === 0) return <EmptyState text="未找到 MCP 服务" />;
  return listings.map((listing) => (
    <McpMarketplaceCard key={listing.id} listing={listing} onInstall={onInstall} />
  ));
}

function renderServers(
  servers: readonly McpServer[],
  runAction: (action: () => Promise<InstallResult>) => Promise<void>
) {
  if (servers.length === 0) return <EmptyState text="暂无 MCP 服务" />;
  return servers.map((server) => (
    <McpServerCard
      key={server.name}
      onRemove={(name) => runAction(() => window.nexus.mcp.remove(name))}
      onToggle={(name) => runAction(() => window.nexus.mcp.toggle(name))}
      server={server}
    />
  ));
}

function EmptyState({ text }: { readonly text: string }) {
  return (
    <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
      <Server size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
      <div>{text}</div>
    </div>
  );
}

function splitArgs(value: string): readonly string[] {
  const trimmed = value.trim();
  return trimmed === "" ? [] : trimmed.split(/\s+/);
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const headerStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-secondary)",
  display: "flex",
  fontSize: 12,
  justifyContent: "space-between",
  padding: "0 12px 8px",
};

const addFormStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  display: "grid",
  gap: 8,
  margin: "0 12px 8px",
  padding: 12,
};

const searchIconStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  left: 8,
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  color: "var(--text-secondary)",
  width: 86,
};

const messageStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: 11,
  margin: "0 12px 8px",
  padding: "6px 8px",
};
