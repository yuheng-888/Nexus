import React, { useState, useEffect, useCallback } from "react";
import { Package, Download, Star, Search, Power, Trash2, ExternalLink } from "lucide-react";
import type { Plugin } from "../../types/nexus";
import { PluginContributionBadges } from "./PluginContributionBadges";
import { PluginViewToggle, type PluginViewMode } from "./PluginViewToggle";

export function PluginsPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [viewMode, setViewMode] = useState<PluginViewMode>("marketplace");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadPlugins = useCallback(async (query: string) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await window.nexus.marketplace.plugins.search({ query });
      setPlugins(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      console.error("Failed to load plugins:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstalledPlugins = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setPlugins(await window.nexus.marketplace.plugins.installed());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      console.error("Failed to load installed plugins:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadPlugins = async () => {
    return viewMode === "installed" ? loadInstalledPlugins() : loadPlugins(search);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (viewMode === "installed" ? loadInstalledPlugins() : loadPlugins(search));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadInstalledPlugins, loadPlugins, search, viewMode]);

  const handleInstall = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.plugins.install(id);
      setMessage(result.message);
      if (result.success) await reloadPlugins();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      console.error(err);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.plugins.uninstall(id);
      setMessage(result.message);
      if (result.success) await reloadPlugins();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      console.error(err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.plugins.toggle(id);
      setMessage(result.message);
      if (result.success) await reloadPlugins();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      console.error(err);
    }
  };

  const categories = ["全部", ...new Set(plugins.map(p => p.category))];
  const filtered = plugins.filter(p =>
    category === "全部" || p.category === category
  );

  const installedCount = plugins.filter(p => p.installed).length;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  return (
    <div style={{ padding: "0 4px", animation: "fadeIn 0.3s var(--ease-out)" }}>
      {/* Stats */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px 8px", fontSize: 12, color: "var(--text-secondary)",
      }}>
        <span>VS Code Marketplace · {plugins.length} 个可用 · {installedCount} 已安装</span>
      </div>

      {/* Search + Filter */}
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            placeholder="搜索 VS Code 插件..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: 30, paddingLeft: 28, paddingRight: 8,
              fontSize: 12, color: "var(--text-primary)", background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
              outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        <PluginViewToggle
          mode={viewMode}
          onToggle={() => setViewMode(viewMode === "installed" ? "marketplace" : "installed")}
        />
      </div>

      {/* Category pills */}
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "2px 8px", fontSize: 10, borderRadius: 10,
              background: category === cat ? "var(--accent-subtle)" : "transparent",
              border: `1px solid ${category === cat ? "var(--border-accent)" : "var(--border-subtle)"}`,
              color: category === cat ? "var(--text-accent)" : "var(--text-muted)",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
              transition: "all 0.15s",
            }}
          >{cat}</button>
        ))}
      </div>

      {message && (
        <div style={{
          margin: "0 12px 8px", padding: "6px 8px",
          border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)", fontSize: 11,
        }}>
          {message}
        </div>
      )}

      {/* Plugin cards */}
      {loading ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
          <div className="animate-pulse" style={{ fontSize: 12 }}>加载中...</div>
        </div>
      ) : (
        filtered.map((plugin) => (
          <div
            key={plugin.id}
            style={{
              margin: "0 8px 6px", padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: plugin.installed ? "rgba(139, 92, 246, 0.04)" : "var(--bg-card)",
              cursor: "default",
              transition: "all 0.2s var(--ease-out)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-accent)"; e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = plugin.installed ? "rgba(139, 92, 246, 0.04)" : "var(--bg-card)"; }}
          >
            {/* Installed indicator line */}
            {plugin.installed && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: plugin.enabled ? "var(--success)" : "var(--text-muted)" }} />
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{plugin.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{plugin.name}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 10,
                    background: "var(--bg-badge)", color: "var(--text-accent)",
                    fontWeight: 500, letterSpacing: 0.3,
                  }}>{plugin.version}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 10,
                    background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa",
                    fontWeight: 500,
                  }}>VS Code</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
                  {plugin.description}
                </div>
                <PluginContributionBadges contributions={plugin.contributions} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Star size={10} fill="var(--warning)" color="var(--warning)" /> {plugin.rating}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Download size={10} /> {formatNumber(plugin.downloads)}
                  </span>
                  <span style={{
                    fontSize: 10, padding: "1px 5px", borderRadius: 10,
                    background: `${getCategoryColor(plugin.category)}15`, color: getCategoryColor(plugin.category),
                  }}>{plugin.category}</span>
                  <span>{plugin.publisher}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                {plugin.marketplaceUrl && (
                  <button
                    onClick={() => window.open(plugin.marketplaceUrl, "_blank")}
                    style={{
                      display: "flex", alignItems: "center", gap: 3,
                      padding: "3px 8px", borderRadius: "var(--radius-sm)",
                      background: "transparent", border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)", fontSize: 10, cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <ExternalLink size={10} /> 市场
                  </button>
                )}
                {plugin.installed ? (
                  <>
                    <button
                      onClick={() => handleToggle(plugin.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: "var(--radius-sm)",
                        background: plugin.enabled ? "var(--success-bg)" : "var(--bg-tertiary)",
                        border: `1px solid ${plugin.enabled ? "var(--success)" : "var(--border-subtle)"}`,
                        color: plugin.enabled ? "var(--success)" : "var(--text-muted)",
                        fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                      }}
                    >
                      <Power size={10} /> {plugin.enabled ? "已启用" : "已禁用"}
                    </button>
                    <button
                      onClick={() => handleUninstall(plugin.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: "var(--radius-sm)",
                        background: "transparent", border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)", fontSize: 10, cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <Trash2 size={10} /> 卸载
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleInstall(plugin.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 3,
                      padding: "4px 10px", borderRadius: "var(--radius-sm)",
                      background: "var(--accent-subtle)", border: "1px solid var(--border-accent)",
                      color: "var(--text-accent)", fontSize: 10, cursor: "pointer",
                      fontFamily: "inherit", fontWeight: 500,
                    }}
                  >
                    <Download size={10} /> 安装
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <Package size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>未找到匹配的插件</div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "格式化": "#a78bfa", "检查": "#f59e0b", "Git": "#34d399", "AI": "#ec4899",
    "DevOps": "#60a5fa", "CSS": "#f472b6", "语言": "#3b82f6", "测试": "#22d3ee",
  };
  return colors[category] ?? "#a78bfa";
}
