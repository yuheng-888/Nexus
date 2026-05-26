import React, { useEffect } from "react";
import { Cpu } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { ApiConfig } from "../../types/nexus";
import { activeModelConfig, formatModelLimitSummary } from "./modelControlsModel";

export interface ModelControlsProps {
  readonly disabled: boolean;
}

export function ModelControls({ disabled }: ModelControlsProps) {
  const apiConfigs = useStore((s) => s.apiConfigs);
  const activeApiConfig = useStore((s) => s.activeApiConfig);
  const setApiConfigs = useStore((s) => s.setApiConfigs);
  const setActiveApiConfig = useStore((s) => s.setActiveApiConfig);
  const activeConfig = activeModelConfig(apiConfigs, activeApiConfig);

  useEffect(() => {
    if (apiConfigs.length === 0) {
      void loadConfigs(setApiConfigs);
    }
  }, [apiConfigs.length, setApiConfigs]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <Cpu size={12} color="var(--text-accent)" />
      <select
        value={activeConfig?.id ?? ""}
        onChange={(event) => void activateConfig(event.target.value, setActiveApiConfig)}
        disabled={disabled || apiConfigs.length === 0}
        style={selectStyle}
        title="切换模型配置"
      >
        {apiConfigs.length === 0 ? (
          <option value="">未配置模型</option>
        ) : (
          apiConfigs.map((config) => (
            <option key={config.id} value={config.id}>{config.name} · {config.model}</option>
          ))
        )}
      </select>
      {activeConfig && (
        <span style={limitStyle} title={formatModelLimitSummary(activeConfig)}>
          {formatModelLimitSummary(activeConfig)}
        </span>
      )}
    </div>
  );
}

export function useActiveAiConfig(): ApiConfig | null {
  const apiConfigs = useStore((s) => s.apiConfigs);
  const activeApiConfig = useStore((s) => s.activeApiConfig);
  return activeModelConfig(apiConfigs, activeApiConfig);
}

async function activateConfig(
  id: string,
  setActiveApiConfig: (id: string | null) => void
): Promise<void> {
  if (id === "") {
    return;
  }

  await window.nexus.api.setActive(id);
  setActiveApiConfig(id);
}

async function loadConfigs(
  setApiConfigs: (configs: ApiConfig[], activeId?: string | null) => void
): Promise<void> {
  const result = await window.nexus.api.configs();
  setApiConfigs(result.configs, result.activeId);
}

const selectStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: 11,
  height: 22,
  maxWidth: 220,
  outline: "none",
  padding: "0 6px",
};

const limitStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 10,
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
