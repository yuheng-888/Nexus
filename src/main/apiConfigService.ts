import type { ApiConfig, ApiProviderPreset, ApiTestResult } from "../contracts.js";
import { ApiConfigStore, type ApiConfigStoreOptions } from "./apiConfigStore.js";
import { fillCustomBodyTemplate } from "./customModelProtocol.js";
import { openAiChatCompletionsUrl } from "./modelEndpoint.js";
import { validateJsonSuccess } from "./modelHttp.js";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;
const TEST_MAX_TOKENS = 10;

const PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    provider: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    defaultModel: "gpt-4o",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    description: "OpenAI Chat Completions API（通用协议）",
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    defaultModel: "claude-sonnet-4-20250514",
    authHeader: "x-api-key",
    authPrefix: "",
    description: "Anthropic Messages API（Claude 系列模型）",
  },
  {
    provider: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    defaultModel: "gemini-2.0-flash",
    authHeader: "x-goog-api-key",
    authPrefix: "",
    description: "Google Gemini API（Gemini 系列模型）",
  },
  {
    provider: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    description: "DeepSeek API（兼容 OpenAI 格式）",
  },
  {
    provider: "custom",
    name: "自定义协议",
    baseUrl: "",
    models: [],
    defaultModel: "",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    description: "自定义 API 端点，支持配置请求/响应格式",
  },
];

const DEFAULT_CONFIGS: ApiConfig[] = [
  {
    id: "openai-default",
    name: "OpenAI GPT-4o",
    provider: "openai",
	    apiKey: "",
	    baseUrl: "https://api.openai.com/v1",
	    model: "gpt-4o",
	    maxTokens: DEFAULT_MAX_TOKENS,
	    temperature: DEFAULT_TEMPERATURE,
    enabled: true,
  },
  {
    id: "anthropic-default",
    name: "Claude Sonnet",
    provider: "anthropic",
	    apiKey: "",
	    baseUrl: "https://api.anthropic.com",
	    model: "claude-sonnet-4-20250514",
	    maxTokens: DEFAULT_MAX_TOKENS,
	    temperature: DEFAULT_TEMPERATURE,
    enabled: true,
  },
];

const DEFAULT_ACTIVE_ID = "anthropic-default";

export class ApiConfigService {
  private configs: ApiConfig[];
  private activeId: string | null;
  private readonly store: ApiConfigStore;

  constructor(options: ApiConfigStoreOptions = {}) {
    this.store = new ApiConfigStore(options);
    const state = this.store.load({
      activeId: DEFAULT_ACTIVE_ID,
      configs: DEFAULT_CONFIGS
    });
    this.activeId = state.activeId;
    this.configs = [...state.configs];
  }

  getPresets(): ApiProviderPreset[] {
    return PROVIDER_PRESETS;
  }

  getConfigs(): { configs: ApiConfig[]; activeId: string | null } {
    return { configs: this.configs, activeId: this.activeId };
  }

  addConfig(config: Omit<ApiConfig, "id">): ApiConfig {
    const newConfig: ApiConfig = { ...config, id: `config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    this.configs = [...this.configs, newConfig];
    this.persist();
    return newConfig;
  }

  updateConfig(id: string, updates: Partial<ApiConfig>): ApiConfig | null {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.configs = this.configs.map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.persist();
    return this.configs[idx];
  }

  removeConfig(id: string): boolean {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.configs = this.configs.filter((c) => c.id !== id);
    if (this.activeId === id) this.activeId = this.configs[0]?.id ?? null;
    this.persist();
    return true;
  }

  setActive(id: string | null): void {
    if (id !== null && !this.configs.some((config) => config.id === id)) {
      throw new Error(`API config does not exist: ${id}`);
    }

    this.activeId = id;
    this.persist();
  }

  getActive(): ApiConfig | null {
    if (!this.activeId) return null;
    return this.configs.find((c) => c.id === this.activeId) ?? null;
  }

	  async testConnection(id: string): Promise<ApiTestResult> {
	    const config = this.configs.find((c) => c.id === id);
	    if (!config) return { success: false, message: "配置不存在" };
	    if (!config.apiKey) return { success: false, message: "API Key 未设置" };

	    const start = Date.now();

	    try {
	      const res = await testProviderConnection(config);
	      return await toTestResult(res, start);
	    } catch (err) {
	      return { success: false, message: `连接错误: ${err instanceof Error ? err.message : String(err)}`, latency: Date.now() - start };
	    }
	  }

  private persist(): void {
    this.store.save({
      activeId: this.activeId,
      configs: this.configs
    });
  }
	}

async function testProviderConnection(config: ApiConfig): Promise<Response> {
  if (config.provider === "anthropic") {
    return testAnthropicConnection(config);
  }

  if (config.provider === "google") {
    return fetch(`${config.baseUrl}/models/${config.model}?key=${config.apiKey}`);
  }

  return testOpenAiCompatibleConnection(config);
}

async function testAnthropicConnection(config: ApiConfig): Promise<Response> {
  return fetch(`${config.baseUrl}/v1/messages`, {
    body: JSON.stringify({
      max_tokens: TEST_MAX_TOKENS,
      messages: [{ content: "Hi", role: "user" }],
      model: config.model
    }),
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": config.apiKey
    },
    method: "POST"
  });
}

async function testOpenAiCompatibleConnection(config: ApiConfig): Promise<Response> {
  return fetch(getOpenAiCompatibleUrl(config), {
    body: getOpenAiCompatibleBody(config),
    headers: getOpenAiCompatibleHeaders(config),
    method: config.customMethod ?? "POST"
  });
}

function getOpenAiCompatibleUrl(config: ApiConfig): string {
  return openAiChatCompletionsUrl(config.baseUrl);
}

function getOpenAiCompatibleHeaders(config: ApiConfig): Record<string, string> {
  return {
    ...(config.provider === "custom" ? config.customHeaders : undefined),
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json"
  };
}

function getOpenAiCompatibleBody(config: ApiConfig): string {
  if (config.provider === "custom" && config.customBodyTemplate) {
    return fillCustomBodyTemplate({
      messages: [{ content: "Hi", role: "user" }],
      model: config.model,
      template: config.customBodyTemplate
    });
  }

  return JSON.stringify({
    max_tokens: TEST_MAX_TOKENS,
    messages: [{ content: "Hi", role: "user" }],
    model: config.model
  });
}

async function toTestResult(res: Response, start: number): Promise<ApiTestResult> {
  const latency = Date.now() - start;

  if (!res.ok) {
    return { latency, message: `连接失败: HTTP ${res.status}`, success: false };
  }

  try {
    await validateJsonSuccess(res, "API test");
    return { latency, message: "连接成功", success: true };
  } catch (error) {
    return { latency, message: error instanceof Error ? error.message : String(error), success: false };
  }
}
