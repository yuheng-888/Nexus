import type React from "react";
import type { ApiConfig, ApiTestResult } from "../../types/nexus";
import { ghostBtn, inputStyle, PROVIDER_COLORS } from "./settingsStyles";

export function cardStyle(config: ApiConfig, isActive: boolean): React.CSSProperties {
  return {
    background: isActive ? `${PROVIDER_COLORS[config.provider]}08` : "var(--bg-card)",
    border: isActive ? `1px solid ${PROVIDER_COLORS[config.provider]}50` : "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    margin: "0 8px 6px",
    overflow: "hidden",
    transition: "all 0.2s var(--ease-out)"
  };
}

export function titleStyle(config: ApiConfig, isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? "var(--text-active)" : "var(--text-primary)",
    fontSize: 12,
    fontWeight: 600
  };
}

export function activeBadgeStyle(provider: ApiConfig["provider"]): React.CSSProperties {
  return {
    background: `${PROVIDER_COLORS[provider]}20`,
    borderRadius: 10,
    color: PROVIDER_COLORS[provider],
    fontSize: 9,
    fontWeight: 600,
    padding: "1px 6px"
  };
}

export function activeButtonStyle(config: ApiConfig, isActive: boolean): React.CSSProperties {
  return {
    ...ghostBtn,
    borderColor: isActive ? PROVIDER_COLORS[config.provider] : "var(--border)",
    color: isActive ? PROVIDER_COLORS[config.provider] : "var(--text-secondary)"
  };
}

export function testResultStyle(result: ApiTestResult): React.CSSProperties {
  return {
    alignItems: "center",
    background: result.success ? "var(--success-bg)" : "var(--error-bg)",
    border: `1px solid ${result.success ? "var(--success)" : "var(--error)"}`,
    borderRadius: "var(--radius-sm)",
    color: result.success ? "var(--success)" : "var(--error)",
    display: "flex",
    fontSize: 11,
    gap: 6,
    marginBottom: 8,
    padding: "6px 10px"
  };
}

export const headerStyle: React.CSSProperties = {
  alignItems: "center",
  cursor: "pointer",
  display: "flex",
  gap: 8,
  padding: "10px 12px"
};

export const eyeButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  position: "absolute",
  right: 4,
  top: "50%",
  transform: "translateY(-50%)"
};

export const customBoxStyle: React.CSSProperties = {
  background: "rgba(236, 72, 153, 0.05)",
  border: "1px solid rgba(236, 72, 153, 0.15)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 8,
  padding: 10
};

export const customTitleStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--accent-pink)",
  display: "flex",
  fontSize: 11,
  fontWeight: 600,
  gap: 4,
  marginBottom: 8
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  height: 56,
  padding: "6px 8px",
  resize: "vertical"
};

export const jsonErrorStyle: React.CSSProperties = {
  color: "var(--error)",
  fontSize: 10,
  marginTop: -3
};

export const deleteButtonStyle: React.CSSProperties = {
  ...ghostBtn,
  alignItems: "center",
  borderColor: "var(--error-bg)",
  color: "var(--error)",
  display: "flex",
  gap: 4
};
