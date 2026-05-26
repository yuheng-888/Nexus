import type { ApiConfig } from "../../types/nexus";

const DEFAULT_CONTEXT_WINDOW_TOKENS = 32000;
const MIN_USABLE_CONTEXT_TOKENS = 4096;

export function activeModelConfig(configs: readonly ApiConfig[], activeId: string | null): ApiConfig | null {
  if (configs.length === 0) return null;
  if (activeId === null) return configs[0] ?? null;

  return configs.find((config) => config.id === activeId) ?? configs[0] ?? null;
}

export function modelContextBudget(config: Pick<ApiConfig, "maxTokens">): number {
  return Math.max(MIN_USABLE_CONTEXT_TOKENS, DEFAULT_CONTEXT_WINDOW_TOKENS - config.maxTokens);
}

export function formatModelLimitSummary(config: ApiConfig): string {
  return [
    config.provider,
    `输出 ${config.maxTokens}`,
    `上下文约 ${modelContextBudget(config)}`,
    `T ${config.temperature}`
  ].join(" · ");
}

export function aiSendBlockReason(config: ApiConfig | null): string | null {
  if (config === null) return "未配置模型";
  if (!config.enabled) return "模型配置已停用";
  if (config.apiKey.trim() === "") return "API Key 未设置";
  if (config.model.trim() === "") return "模型名称未设置";

  return null;
}
