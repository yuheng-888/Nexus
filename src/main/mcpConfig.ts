import type { McpServer, McpServerTransport } from "../contracts.js";

export interface ParsedMcpConfig {
  readonly args: readonly string[];
  readonly command?: string;
  readonly env: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly name: string;
  readonly type: McpServerTransport;
  readonly url?: string;
}

interface ParseOptions {
  readonly fallbackName: string;
}

type JsonRecord = Record<string, unknown>;

const MAX_SEARCH_DEPTH = 6;

export function parseMcpConfig(value: unknown, options: ParseOptions): ParsedMcpConfig {
  const config = coerceRecord(value);
  const mcpServers = readMcpServers(config);
  const [name, server] = pickServer(mcpServers, options.fallbackName);

  return normalizeServer(name, server);
}

export function findMcpConfig(value: unknown, fallbackName: string): ParsedMcpConfig | null {
  const found = findRawMcpConfig(value, 0);
  return found === null ? null : parseMcpConfig(found, { fallbackName });
}

export function toStoredMcpServer(input: {
  readonly config: ParsedMcpConfig;
  readonly enabled: boolean;
  readonly metadata: Partial<McpServer>;
}): McpServer {
  return {
    args: input.config.args,
    command: input.config.command,
    enabled: input.enabled,
    env: input.config.env,
    headers: input.config.headers,
    name: input.config.name,
    source: "manual",
    type: input.config.type,
    url: input.config.url,
    ...input.metadata
  };
}

export function normalizeManualServer(server: Partial<McpServer>): McpServer {
  return {
    args: normalizeArgs(server.args),
    command: normalizeOptionalString(server.command),
    description: normalizeOptionalString(server.description),
    enabled: server.enabled ?? true,
    env: normalizeStringRecord(server.env),
    headers: normalizeOptionalRecord(server.headers),
    name: requireName(server.name),
    source: server.source ?? "manual",
    type: normalizeTransport(server.type, server.command, server.url),
    url: normalizeOptionalString(server.url)
  };
}

function findRawMcpConfig(value: unknown, depth: number): unknown | null {
  if (depth > MAX_SEARCH_DEPTH) return null;
  if (typeof value === "string") return parseStringCandidate(value, depth);
  if (Array.isArray(value)) return findInArray(value, depth);
  if (!isRecord(value)) return null;
  if (isRecord(value.mcpServers)) return value;

  return findInRecord(value, depth);
}

function parseStringCandidate(value: string, depth: number): unknown | null {
  const trimmed = value.trim();
  if (!trimmed.includes("mcpServers")) return null;

  try {
    return findRawMcpConfig(JSON.parse(trimmed), depth + 1);
  } catch {
    return null;
  }
}

function findInArray(values: readonly unknown[], depth: number): unknown | null {
  for (const item of values) {
    const found = findRawMcpConfig(item, depth + 1);
    if (found !== null) return found;
  }

  return null;
}

function findInRecord(record: JsonRecord, depth: number): unknown | null {
  for (const value of Object.values(record)) {
    const found = findRawMcpConfig(value, depth + 1);
    if (found !== null) return found;
  }

  return null;
}

function coerceRecord(value: unknown): JsonRecord {
  if (typeof value === "string") return coerceRecord(JSON.parse(value));
  if (isRecord(value)) return value;
  throw new Error("MCP 配置必须是 JSON 对象");
}

function readMcpServers(config: JsonRecord): JsonRecord {
  if (!isRecord(config.mcpServers)) {
    throw new Error("MCP 配置缺少 mcpServers 对象");
  }

  return config.mcpServers;
}

function pickServer(servers: JsonRecord, fallbackName: string): readonly [string, JsonRecord] {
  const preferred = servers[fallbackName];
  if (isRecord(preferred)) return [fallbackName, preferred];

  for (const [name, server] of Object.entries(servers)) {
    if (isRecord(server)) return [name, server];
  }

  throw new Error("MCP 配置中没有可安装的服务");
}

function normalizeServer(name: string, server: JsonRecord): ParsedMcpConfig {
  const command = normalizeOptionalString(server.command);
  const url = normalizeOptionalString(server.url);

  if (command === undefined && url === undefined) {
    throw new Error(`MCP 服务 ${name} 缺少 command 或 url`);
  }

  return {
    args: normalizeArgs(server.args),
    command,
    env: normalizeStringRecord(server.env),
    headers: normalizeOptionalRecord(server.headers),
    name: requireName(name),
    type: normalizeTransport(readString(server.type), command, url),
    url
  };
}

function normalizeTransport(
  type: unknown,
  command: string | undefined,
  url: string | undefined
): McpServerTransport {
  if (type === "sse" || type === "http" || type === "stdio") return type;
  if (command !== undefined) return "stdio";
  if (url !== undefined && url.includes("/sse")) return "sse";
  return "http";
}

function normalizeArgs(value: unknown): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("MCP args 必须是字符串数组");

  return value.map((item) => {
    if (typeof item !== "string") throw new Error("MCP args 只能包含字符串");
    return item;
  });
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error("MCP env 必须是对象");

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function normalizeOptionalRecord(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined;
  return normalizeStringRecord(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  const text = readString(value)?.trim();
  return text === "" || text === undefined ? undefined : text;
}

function requireName(value: unknown): string {
  const name = normalizeOptionalString(value);
  if (name === undefined) throw new Error("MCP 服务名称不能为空");
  return name;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}
