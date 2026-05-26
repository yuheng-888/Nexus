export type McpMarketplaceSource = "all" | "glama" | "mcp.so";
export type McpServerSource = "builtin" | "manual" | "glama" | "mcp.so";
export type McpServerTransport = "stdio" | "sse" | "http";

export interface McpServer {
  readonly args: readonly string[];
  readonly author?: string;
  readonly category?: string;
  readonly command?: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly env: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly marketplaceId?: string;
  readonly marketplaceUrl?: string;
  readonly name: string;
  readonly repositoryUrl?: string;
  readonly source: McpServerSource;
  readonly type: McpServerTransport;
  readonly url?: string;
}

export interface McpSearchRequest {
  readonly query?: string;
  readonly source?: McpMarketplaceSource;
}

export interface McpMarketplaceServer {
  readonly args: readonly string[];
  readonly author: string;
  readonly category: string;
  readonly command?: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly env: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly id: string;
  readonly installError?: string;
  readonly installable: boolean;
  readonly installed: boolean;
  readonly marketplaceUrl: string;
  readonly name: string;
  readonly repositoryUrl?: string;
  readonly serverName?: string;
  readonly source: "glama" | "mcp.so";
  readonly type: McpServerTransport;
  readonly url?: string;
}

export type McpServerAddRequest = Pick<
  McpServer,
  "args" | "command" | "env" | "headers" | "name" | "type" | "url"
> & Partial<Pick<McpServer, "description">>;
