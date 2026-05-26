import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ApiConfig, ApiProvider } from "../contracts.js";

export interface ApiConfigState {
  readonly activeId: string | null;
  readonly configs: readonly ApiConfig[];
}

export interface ApiConfigStoreOptions {
  readonly storePath?: string;
}

type JsonRecord = Record<string, unknown>;

const STORE_MODE = 0o600;
const STORE_VERSION = 1;
const PROVIDERS = new Set<ApiProvider>(["anthropic", "custom", "deepseek", "google", "openai"]);
const METHODS = new Set(["GET", "POST", "PUT"]);

export class ApiConfigStore {
  readonly storePath: string;

  constructor(options: ApiConfigStoreOptions = {}) {
    this.storePath = options.storePath ?? defaultApiConfigStorePath();
  }

  load(defaultState: ApiConfigState): ApiConfigState {
    if (!existsSync(this.storePath)) {
      return cloneState(defaultState);
    }

    return parseState(readFileSync(this.storePath, "utf8"), this.storePath);
  }

  save(state: ApiConfigState): void {
    const payload = {
      activeId: state.activeId,
      configs: state.configs,
      version: STORE_VERSION
    };
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: "utf8",
      mode: STORE_MODE
    });
    chmodSync(this.storePath, STORE_MODE);
  }
}

export function defaultApiConfigStorePath(): string {
  return join(homedir(), ".nexus", "api-configs.json");
}

function parseState(source: string, storePath: string): ApiConfigState {
  const payload = parseJson(source, storePath);
  const configs = readConfigs(payload.configs, storePath);
  const activeId = readActiveId(payload.activeId, configs, storePath);

  return { activeId, configs };
}

function parseJson(source: string, storePath: string): JsonRecord {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch (error) {
    throw new Error(`API 配置文件不是合法 JSON: ${storePath}`, { cause: error });
  }

  throw new Error(`API 配置文件根节点必须是对象: ${storePath}`);
}

function readConfigs(value: unknown, storePath: string): readonly ApiConfig[] {
  if (!Array.isArray(value)) {
    throw new Error(`API 配置文件缺少 configs 数组: ${storePath}`);
  }

  return value.map((item, index) => readConfig(item, index, storePath));
}

function readConfig(value: unknown, index: number, storePath: string): ApiConfig {
  if (!isRecord(value)) {
    throw new Error(`API 配置第 ${index + 1} 项必须是对象: ${storePath}`);
  }

  return {
    apiKey: readString(value.apiKey, "apiKey", index),
    baseUrl: readString(value.baseUrl, "baseUrl", index),
    customBodyTemplate: readOptionalString(value.customBodyTemplate, "customBodyTemplate", index),
    customHeaders: readOptionalStringRecord(value.customHeaders, "customHeaders", index),
    customMethod: readOptionalMethod(value.customMethod, index),
    customResponsePath: readOptionalString(value.customResponsePath, "customResponsePath", index),
    enabled: readBoolean(value.enabled, "enabled", index),
    id: readString(value.id, "id", index),
    maxTokens: readNumber(value.maxTokens, "maxTokens", index),
    model: readString(value.model, "model", index),
    name: readString(value.name, "name", index),
    provider: readProvider(value.provider, index),
    temperature: readNumber(value.temperature, "temperature", index)
  };
}

function readActiveId(
  value: unknown,
  configs: readonly ApiConfig[],
  storePath: string
): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`API 配置 activeId 必须是字符串或 null: ${storePath}`);
  if (configs.some((config) => config.id === value)) return value;
  throw new Error(`API 配置 activeId 指向不存在的配置: ${value}`);
}

function cloneState(state: ApiConfigState): ApiConfigState {
  return {
    activeId: state.activeId,
    configs: state.configs.map((config) => ({ ...config }))
  };
}

function readProvider(value: unknown, index: number): ApiProvider {
  if (typeof value === "string" && PROVIDERS.has(value as ApiProvider)) return value as ApiProvider;
  throw fieldError("provider", index);
}

function readOptionalMethod(value: unknown, index: number): "GET" | "POST" | "PUT" | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && METHODS.has(value)) return value as "GET" | "POST" | "PUT";
  throw fieldError("customMethod", index);
}

function readString(value: unknown, field: string, index: number): string {
  if (typeof value === "string") return value;
  throw fieldError(field, index);
}

function readOptionalString(value: unknown, field: string, index: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  throw fieldError(field, index);
}

function readNumber(value: unknown, field: string, index: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw fieldError(field, index);
}

function readBoolean(value: unknown, field: string, index: number): boolean {
  if (typeof value === "boolean") return value;
  throw fieldError(field, index);
}

function readOptionalStringRecord(
  value: unknown,
  field: string,
  index: number
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw fieldError(field, index);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (typeof item !== "string") throw fieldError(field, index);
    return [key, item];
  }));
}

function fieldError(field: string, index: number): Error {
  return new Error(`API 配置第 ${index + 1} 项字段 ${field} 类型无效`);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
