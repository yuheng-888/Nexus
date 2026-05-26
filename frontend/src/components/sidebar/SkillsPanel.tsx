import React, { useState, useEffect } from "react";
import { Sparkles, Download, Star, Search, Power, Trash2, Zap, Code, Brain, Database, Globe, Shield, Lock, Activity } from "lucide-react";
import type { Skill } from "../../types/nexus";

const iconMap: Record<string, React.ReactNode> = {
  Code: <Code size={16} />, Zap: <Zap size={16} />, Globe: <Globe size={16} />,
  Shield: <Shield size={16} />, Database: <Database size={16} />, Brain: <Brain size={16} />,
  Lock: <Lock size={16} />, Activity: <Activity size={16} />,
};

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSkills(search);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadSkills = async (query: string) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await window.nexus.marketplace.skills.search({ query });
      setSkills(data);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error("Failed to load skills:", err);
      setMessage(text);
    }
    finally { setLoading(false); }
  };

  const handleInstall = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.skills.install(id);
      setMessage(result.message);
      if (result.success) await loadSkills(search);
    } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  };

  const handleUninstall = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.skills.uninstall(id);
      setMessage(result.message);
      if (result.success) await loadSkills(search);
    } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  };

  const handleToggle = async (id: string) => {
    try {
      const result = await window.nexus.marketplace.skills.toggle(id);
      setMessage(result.message);
      if (result.success) await loadSkills(search);
    } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = skills.filter((s) =>
    normalizedSearch === "" ||
    s.name.toLowerCase().includes(normalizedSearch) ||
    s.description.toLowerCase().includes(normalizedSearch) ||
    s.category.toLowerCase().includes(normalizedSearch)
  );
  const installedCount = skills.filter(s => s.installed).length;

  return (
    <div style={{ padding: "0 4px", animation: "fadeIn 0.3s var(--ease-out)" }}>
      {/* Stats */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px 8px", fontSize: 12, color: "var(--text-secondary)",
      }}>
        <span>SkillsMP · {skills.length} 个可用 · {installedCount} 已启用</span>
      </div>

      {/* Search */}
      <div style={{ padding: "0 12px 8px" }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            placeholder="搜索 SkillsMP 技能..."
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
      </div>

      {/* Featured banner */}
      <div style={{ padding: "0 12px 8px" }}>
        <div style={{
          padding: "14px", borderRadius: "var(--radius-md)",
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.06))",
          border: "1px solid var(--border-accent)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -20, right: -20, width: 80, height: 80,
            borderRadius: "50%", background: "var(--gradient-glow)", opacity: 0.5,
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Sparkles size={14} color="var(--text-accent)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-accent)" }}>SkillsMP 技能源</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            从 skillsmp.com 搜索 Agent Skills，启用后写入本机 Skills 目录
          </div>
        </div>
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

      {/* Skills list */}
      {loading ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
          <div className="animate-pulse" style={{ fontSize: 12 }}>加载中...</div>
        </div>
      ) : (
        filtered.map((skill) => (
          <div
            key={skill.id}
            style={{
              margin: "0 8px 6px", padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: skill.installed ? "rgba(139, 92, 246, 0.04)" : "var(--bg-card)",
              transition: "all 0.2s var(--ease-out)",
              position: "relative", overflow: "hidden",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          >
            {skill.installed && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: skill.enabled ? skill.color : "var(--text-muted)" }} />
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)",
                background: `${skill.color}12`, border: `1px solid ${skill.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: skill.color, flexShrink: 0,
              }}>
                {iconMap[skill.icon] ?? <Sparkles size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{skill.name}</span>
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "var(--bg-badge)", color: "var(--text-accent)", fontWeight: 500 }}>{skill.version}</span>
                  {skill.source === "skillsmp" && (
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 10, background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", fontWeight: 500 }}>SkillsMP</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
                  {skill.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: `${skill.color}15`, color: skill.color }}>{skill.category}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Star size={10} fill="var(--warning)" color="var(--warning)" /> {skill.rating}
                  </span>
                  <span>{skill.author}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                {skill.installed ? (
                  <>
                    <button
                      onClick={() => handleToggle(skill.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: "var(--radius-sm)",
                        background: skill.enabled ? "var(--success-bg)" : "var(--bg-tertiary)",
                        border: `1px solid ${skill.enabled ? "var(--success)" : "var(--border-subtle)"}`,
                        color: skill.enabled ? "var(--success)" : "var(--text-muted)",
                        fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                      }}
                    >
                      <Power size={10} /> {skill.enabled ? "运行中" : "已停止"}
                    </button>
                    <button
                      onClick={() => handleUninstall(skill.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: "var(--radius-sm)",
                        background: "transparent", border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <Trash2 size={10} /> 禁用
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleInstall(skill.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 3,
                      padding: "4px 10px", borderRadius: "var(--radius-sm)",
                      background: "var(--accent-subtle)", border: "1px solid var(--border-accent)",
                      color: "var(--text-accent)", fontSize: 10, cursor: "pointer",
                      fontFamily: "inherit", fontWeight: 500,
                    }}
                  >
                    <Download size={10} /> 启用
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <Sparkles size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>未找到匹配的技能</div>
        </div>
      )}
    </div>
  );
}
