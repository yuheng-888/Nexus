import type { McpMarketplaceServer, McpSearchRequest } from "../contracts.js";
import { findMcpConfig } from "./mcpConfig.js";
import type { FetchLike } from "./skillsMpClient.js";

const MCP_SO_SEARCH_ENDPOINT = "https://mcp.so/search.html";
const DEFAULT_LIMIT = 24;

interface McpSoProject {
  readonly author_name?: unknown;
  readonly category?: unknown;
  readonly description?: unknown;
  readonly metadata?: unknown;
  readonly name?: unknown;
  readonly server_config?: unknown;
  readonly title?: unknown;
  readonly type?: unknown;
  readonly url?: unknown;
  readonly uuid?: unknown;
}

export async function searchMcpSoServers(
  request: McpSearchRequest,
  fetcher: FetchLike
): Promise<readonly McpMarketplaceServer[]> {
  const response = await fetcher(createSearchUrl(request.query));
  if (!response.ok) throw new Error(`MCP.so 查询失败: HTTP ${response.status}`);

  return parseMcpSoHtml(await response.text(), request.query);
}

export function parseMcpSoHtml(html: string, query?: string): readonly McpMarketplaceServer[] {
  const decoded = decodeNextFlightText(html);
  const projects = extractProjectObjects(decoded).filter(isMcpServerProject);
  const filtered = filterByQuery(projects, query);

  return dedupeById(filtered.map(toListing)).slice(0, DEFAULT_LIMIT);
}

function createSearchUrl(query: string | undefined): string {
  const url = new URL(MCP_SO_SEARCH_ENDPOINT);
  const normalized = query?.trim();
  if (normalized !== undefined && normalized !== "") url.searchParams.set("q", normalized);
  return url.toString();
}

function decodeNextFlightText(html: string): string {
  const chunks: string[] = [];
  const pattern = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;

  for (const match of html.matchAll(pattern)) {
    chunks.push(JSON.parse(`"${match[1]}"`) as string);
  }

  if (chunks.length === 0) throw new Error("MCP.so 页面缺少 Next flight 数据");
  return chunks.join("");
}

function extractProjectObjects(decoded: string): readonly McpSoProject[] {
  const projects: McpSoProject[] = [];
  let index = 0;

  while (index < decoded.length) {
    const start = decoded.indexOf('{"id":', index);
    if (start === -1) break;
    const objectText = readBalancedJsonObject(decoded, start);
    index = start + Math.max(objectText.length, 1);
    if (objectText.includes('"server_config"')) projects.push(JSON.parse(objectText));
  }

  return projects;
}

function readBalancedJsonObject(text: string, start: number): string {
  let depth = 0;
  let escaped = false;
  let inString = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === "\"") {
      inString = !inString;
    } else if (!inString && char === "{") {
      depth += 1;
    } else if (!inString && char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  throw new Error("MCP.so 页面包含未闭合的服务 JSON 对象");
}

function isMcpServerProject(project: McpSoProject): boolean {
  return readString(project.type) === "server" || readString(project.server_config) !== "";
}

function filterByQuery(projects: readonly McpSoProject[], query: string | undefined): readonly McpSoProject[] {
  const needle = query?.trim().toLowerCase();
  if (needle === undefined || needle === "") return projects;

  return projects.filter((project) => searchableText(project).includes(needle));
}

function searchableText(project: McpSoProject): string {
  return [
    readString(project.name),
    readString(project.title),
    readString(project.description),
    readString(project.category)
  ].join(" ").toLowerCase();
}

function toListing(project: McpSoProject): McpMarketplaceServer {
  const name = readString(project.title) || readString(project.name) || "Unnamed MCP Server";
  const config = findMcpConfig(project.server_config, readString(project.name) || name);
  const installError = config === null ? "MCP.so 未提供可安装的 mcpServers 配置" : undefined;

  return {
    args: config?.args ?? [],
    author: readString(project.author_name) || "MCP.so",
    category: readString(project.category) || "MCP.so",
    command: config?.command,
    description: readString(project.description),
    enabled: false,
    env: config?.env ?? {},
    headers: config?.headers,
    id: `mcp.so:${readString(project.name) || readString(project.uuid)}`,
    installError,
    installable: config !== null,
    installed: false,
    marketplaceUrl: "https://mcp.so/search.html",
    name,
    repositoryUrl: readString(project.url) || undefined,
    serverName: config?.name,
    source: "mcp.so",
    type: config?.type ?? "stdio",
    url: config?.url
  };
}

function dedupeById(listings: readonly McpMarketplaceServer[]): readonly McpMarketplaceServer[] {
  const seen = new Set<string>();

  return listings.filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
