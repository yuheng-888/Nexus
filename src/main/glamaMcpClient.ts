import type { McpMarketplaceServer, McpSearchRequest } from "../contracts.js";
import { findMcpConfig } from "./mcpConfig.js";
import type { FetchLike } from "./skillsMpClient.js";

const GLAMA_ENDPOINT = "https://glama.ai/api/mcp/v1/servers";
const DEFAULT_LIMIT = 24;

interface GlamaResponse {
  readonly servers?: readonly GlamaServer[];
}

interface GlamaServer {
  readonly attributes?: readonly string[];
  readonly description?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
  readonly namespace?: unknown;
  readonly repository?: {
    readonly url?: unknown;
  };
  readonly slug?: unknown;
  readonly url?: unknown;
}

export async function searchGlamaMcpServers(
  request: McpSearchRequest,
  fetcher: FetchLike
): Promise<readonly McpMarketplaceServer[]> {
  const response = await fetcher(createSearchUrl(request.query));
  if (!response.ok) throw new Error(`Glama MCP 查询失败: HTTP ${response.status}`);

  return parseGlamaResponse(await response.json());
}

function createSearchUrl(query: string | undefined): string {
  const url = new URL(GLAMA_ENDPOINT);
  const normalized = query?.trim();
  url.searchParams.set("first", String(DEFAULT_LIMIT));
  if (normalized !== undefined && normalized !== "") url.searchParams.set("query", normalized);
  return url.toString();
}

function parseGlamaResponse(payload: unknown): readonly McpMarketplaceServer[] {
  const response = payload as GlamaResponse;
  if (!Array.isArray(response.servers)) throw new Error("Glama MCP 返回格式无效");

  return response.servers.map(toListing);
}

function toListing(server: GlamaServer): McpMarketplaceServer {
  const name = readString(server.name) || "Unnamed MCP Server";
  const config = findMcpConfig(server, name);
  const namespace = readString(server.namespace);
  const slug = readString(server.slug);
  const detailId = namespace !== "" && slug !== "" ? `${namespace}/${slug}` : readString(server.id);

  return {
    args: config?.args ?? [],
    author: namespace || "Glama",
    category: readCategory(server.attributes),
    command: config?.command,
    description: readString(server.description),
    enabled: false,
    env: config?.env ?? {},
    headers: config?.headers,
    id: `glama:${detailId}`,
    installError: config === null ? "Glama MCP API 未提供可安装的 mcpServers 配置" : undefined,
    installable: config !== null,
    installed: false,
    marketplaceUrl: readString(server.url) || "https://glama.ai/mcp/servers",
    name,
    repositoryUrl: readString(server.repository?.url) || undefined,
    serverName: config?.name,
    source: "glama",
    type: config?.type ?? "stdio",
    url: config?.url
  };
}

function readCategory(attributes: readonly string[] | undefined): string {
  const first = attributes?.find((item) => item.startsWith("hosting:"));
  return first === undefined ? "Glama" : first.replace("hosting:", "");
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
