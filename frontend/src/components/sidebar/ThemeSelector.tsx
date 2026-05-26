import React from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { useStore } from "../../store/useStore";
import { applyThemePreference, getBrowserThemeTarget, type AppTheme, THEME_OPTIONS } from "../../theme/appTheme";

const THEME_ICONS: Record<AppTheme, React.ReactNode> = {
  nexus: <Palette size={13} />,
  "pure-black": <Moon size={13} />,
  "pure-white": <Sun size={13} />
};

export function ThemeSelector() {
  const appTheme = useStore((state) => state.appTheme);
  const setAppTheme = useStore((state) => state.setAppTheme);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 8 }}>主题</div>
      <div style={selectorStyle}>
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setTheme(option.id, setAppTheme)}
            style={themeButtonStyle(appTheme === option.id)}
            title={option.description}
          >
            {THEME_ICONS[option.id]}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function setTheme(theme: AppTheme, setAppTheme: (theme: AppTheme) => void): void {
  setAppTheme(applyThemePreference(theme, getBrowserThemeTarget()));
}

function themeButtonStyle(active: boolean): React.CSSProperties {
  return {
    alignItems: "center",
    background: active ? "var(--accent-subtle)" : "transparent",
    border: `1px solid ${active ? "var(--border-accent)" : "var(--border-subtle)"}`,
    borderRadius: "var(--radius-sm)",
    color: active ? "var(--text-accent)" : "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    flex: 1,
    fontFamily: "inherit",
    fontSize: 11,
    gap: 5,
    height: 30,
    justifyContent: "center",
    minWidth: 0
  };
}

const selectorStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
};
