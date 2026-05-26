import { describe, expect, it } from "vitest";
import {
  activeModelConfig,
  aiSendBlockReason,
  formatModelLimitSummary,
  modelContextBudget
} from "../frontend/src/components/ai/modelControlsModel.js";
import type { ApiConfig } from "../frontend/src/types/nexus.js";

describe("AI model controls model", () => {
  it("selects the active model config and falls back to the first config", () => {
    expect(activeModelConfig(configs(), "anthropic")).toMatchObject({ id: "anthropic" });
    expect(activeModelConfig(configs(), "missing")).toMatchObject({ id: "openai" });
    expect(activeModelConfig(configs(), null)).toMatchObject({ id: "openai" });
    expect(activeModelConfig([], null)).toBeNull();
  });

  it("formats output and context limits for the assistant header", () => {
    expect(modelContextBudget({ maxTokens: 8192 })).toBe(23808);
    expect(modelContextBudget({ maxTokens: 50000 })).toBe(4096);
    expect(formatModelLimitSummary(configs()[0])).toBe("openai · 输出 8192 · 上下文约 23808 · T 0.2");
  });

  it("explains why the user cannot send a model request", () => {
    expect(aiSendBlockReason(null)).toBe("未配置模型");
    expect(aiSendBlockReason({ ...configs()[0], apiKey: "" })).toBe("API Key 未设置");
    expect(aiSendBlockReason({ ...configs()[0], enabled: false })).toBe("模型配置已停用");
    expect(aiSendBlockReason({ ...configs()[0], model: "" })).toBe("模型名称未设置");
    expect(aiSendBlockReason(configs()[0])).toBeNull();
  });
});

function configs(): ApiConfig[] {
  return [
    {
      apiKey: "sk-test",
      baseUrl: "https://api.openai.test/v1",
      enabled: true,
      id: "openai",
      maxTokens: 8192,
      model: "gpt-5-codex",
      name: "OpenAI",
      provider: "openai",
      temperature: 0.2
    },
    {
      apiKey: "sk-test",
      baseUrl: "https://api.anthropic.test",
      enabled: true,
      id: "anthropic",
      maxTokens: 4096,
      model: "claude-sonnet-4",
      name: "Claude",
      provider: "anthropic",
      temperature: 0.7
    }
  ];
}
