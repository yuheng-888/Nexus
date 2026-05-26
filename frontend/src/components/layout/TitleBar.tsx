import React from "react";
import { useStore } from "../../store/useStore";
import { PanelLeft, Settings } from "lucide-react";

type AppRegionStyle = React.CSSProperties & {
  readonly WebkitAppRegion?: "drag" | "no-drag";
};

const titleBarStyle: AppRegionStyle = {
  height: "var(--titlebar-height)",
  background: "var(--bg-primary)",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  WebkitAppRegion: "drag",
  userSelect: "none",
  position: "relative",
  flexShrink: 0,
  zIndex: 100,
  padding: "0 12px",
};

const titleButtonStyle: AppRegionStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "var(--radius-sm)",
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  transition: "color 0.15s",
  WebkitAppRegion: "no-drag",
};

export function TitleBar() {
  const workspaceName = useStore((s) => s.workspaceName);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setActiveSidebar = useStore((s) => s.setActiveSidebar);

  return (
    <div style={titleBarStyle}>
      {/* macOS traffic lights spacer */}
      <div style={{ width: 68, flexShrink: 0 }} />

      {/* Toggle sidebar */}
      <button
        onClick={toggleSidebar}
        style={titleButtonStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        title="切换侧边栏"
      >
        <PanelLeft size={16} />
      </button>

      {/* Center title with gradient */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          background: "var(--gradient-primary)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 0.5,
        }}>
          {workspaceName}
        </span>
      </div>

      {/* Settings button */}
      <button
        onClick={() => setActiveSidebar("settings")}
        style={titleButtonStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        title="设置"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}
