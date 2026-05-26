import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  InstallResult,
  McpMarketplaceServer,
  McpSearchRequest,
  McpServer,
  McpServerAddRequest
} from "../contracts.js";
import { searchGlamaMcpServers } from "./glamaMcpClient.js";
import { normalizeManualServer, toStoredMcpServer } from "./mcpConfig.js";
import { searchMcpSoServers } from "./mcpSoClient.js";
import type { FetchLike } from "./skillsMpClient.js";

const DEFAULT_CONFIG_PATH = join(homedir(), ".nexus", "mcp-servers.json");

const DEFAULT_MCP_SERVERS: readonly McpServer[] = [{
  args: ["-y", "chrome-mcp@latest"],
  command: "npx",
  description: "Chrome browser automation MCP service for Nexus.",
  enabled: true,
  env: {},
  marketplaceUrl: "https://www.npmjs.com/package/chrome-mcp",
  name: "chrome-mcp",
  repositoryUrl: "https://github.com/moe03/chrome-mcp",
  source: "builtin",
  type: "stdio"
}];

export interface McpServiceOptions {
  readonly configPath?: string;
  readonly fetch?: FetchLike;
}

interface StoredMcpServers {
  readonly servers?: readonly Partial<McpServer>[];
}

export class McpService {
  private marketplaceListings: readonly McpMarketplaceServer[] = [];
  private readonly configPath: string;
  private readonly fetcher: FetchLike;

  constructor(options: McpServiceOptions = {}) {
    this.configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
    this.fetcher = options.fetch ?? fetch;
  }

  async listServers(): Promise<readonly McpServer[]> {
    return this.readServers();
  }

  async addServer(request: McpServerAddRequest): Promise<InstallResult> {
    const server = normalizeManualServer({ ...request, enabled: true, source: "manual" });
    await this.saveServers(upsertByName(await this.readServers(), server));
    return { message: `MCP 服务 ${server.name} 已添加`, success: true };
  }

  async removeServer(name: string): Promise<InstallResult> {
    const servers = await this.readServers();
    if (!servers.some((server) => server.name === name)) {
      return { message: `MCP 服务 ${name} 不存在`, success: false };
    }

    await this.saveServers(servers.filter((server) => server.name !== name));
    return { message: `MCP 服务 ${name} 已删除`, success: true };
  }

  async toggleServer(name: string): Promise<InstallResult> {
    const servers = await this.readServers();
    const server = servers.find((item) => item.name === name);
    if (server === undefined) return { message: `MCP 服务 ${name} 不存在`, success: false };

    const nextServers = servers.map((item) =>
      item.name === name ? { ...item, enabled: !item.enabled } : item
    );
    await this.saveServers(nextServers);
    return { message: `MCP 服务 ${name} 已${server.enabled ? "停用" : "启用"}`, success: true };
  }

  async searchMarketplace(request: McpSearchRequest = {}): Promise<readonly McpMarketplaceServer[]> {
    const listings = await this.fetchMarketplaceListings(request);
    const installed = await this.readServers();
    this.marketplaceListings = applyInstalledState(listings, installed);

    return this.marketplaceListings;
  }

  async installMarketplaceServer(id: string): Promise<InstallResult> {
    const listing = this.marketplaceListings.find((item) => item.id === id);
    if (listing === undefined) return { message: `MCP 服务 ${id} 不存在`, success: false };
    if (!listing.installable) throw new Error(listing.installError ?? `${listing.name} 不可安装`);

    const installed = await this.readServers();
    if (installed.some((server) => server.marketplaceId === id || server.name === listing.name)) {
      return { message: `MCP 服务 ${listing.name} 已安装`, success: false };
    }

    const server = toStoredMcpServer({
      config: { ...listing, name: listing.serverName ?? listing.name },
      enabled: true,
      metadata: {
        author: listing.author,
        category: listing.category,
        description: listing.description,
        marketplaceId: listing.id,
        marketplaceUrl: listing.marketplaceUrl,
        repositoryUrl: listing.repositoryUrl,
        source: listing.source
      }
    });
    await this.saveServers([...installed, server]);
    return { message: `MCP 服务 ${server.name} 已安装`, success: true };
  }

  private async fetchMarketplaceListings(
    request: McpSearchRequest
  ): Promise<readonly McpMarketplaceServer[]> {
    if (request.source === "glama") return searchGlamaMcpServers(request, this.fetcher);
    if (request.source === "mcp.so") return searchMcpSoServers(request, this.fetcher);

    const [glama, mcpSo] = await Promise.all([
      searchGlamaMcpServers(request, this.fetcher),
      searchMcpSoServers(request, this.fetcher)
    ]);
    return [...glama, ...mcpSo];
  }

  private async readServers(): Promise<readonly McpServer[]> {
    try {
      const payload = JSON.parse(await readFile(this.configPath, "utf8")) as StoredMcpServers;
      if (!Array.isArray(payload.servers)) throw new Error("MCP 配置缺少 servers 数组");
      return payload.servers.map(normalizeManualServer);
    } catch (error) {
      if (isMissingFileError(error)) return [...DEFAULT_MCP_SERVERS];
      throw error;
    }
  }

  private async saveServers(servers: readonly McpServer[]): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true });
    await writeFile(this.configPath, `${JSON.stringify({ servers }, null, 2)}\n`);
  }
}

function applyInstalledState(
  listings: readonly McpMarketplaceServer[],
  installed: readonly McpServer[]
): readonly McpMarketplaceServer[] {
  return listings.map((listing) => {
    const server = installed.find((item) => item.marketplaceId === listing.id || item.name === listing.name);
    return server === undefined ? listing : { ...listing, enabled: server.enabled, installed: true };
  });
}

function upsertByName(
  servers: readonly McpServer[],
  nextServer: McpServer
): readonly McpServer[] {
  if (!servers.some((server) => server.name === nextServer.name)) {
    return [...servers, nextServer];
  }

  return servers.map((server) => server.name === nextServer.name ? nextServer : server);
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
