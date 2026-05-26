import React from "react";
import type { AiAgentProvider } from "./agentOutput";

export interface AgentProviderSelectProps {
  readonly disabled: boolean;
  readonly onChange: (provider: AiAgentProvider) => void;
  readonly provider: AiAgentProvider;
}

export function AgentProviderSelect({ disabled, onChange, provider }: AgentProviderSelectProps) {
  return (
    <select
      value={provider}
      onChange={(event) => onChange(event.target.value as AiAgentProvider)}
      disabled={disabled}
      style={selectStyle}
      title="切换代理模式"
    >
      <option value="subagent">Nexus 子代理</option>
      <option value="main">Nexus 主助手</option>
    </select>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: 11,
  height: 22,
  outline: "none",
  padding: "0 6px",
};
