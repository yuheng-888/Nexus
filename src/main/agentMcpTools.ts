import type { InstallResult, McpMarketplaceServer, McpMarketplaceSource, McpSearchRequest, McpServer } from "../contracts.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";
import type { McpService } from "./mcpService.js";
import { McpStdioRuntimeClient, type McpRuntimeClient, type McpRuntimeTool } from "./mcpStdioRuntimeClient.js";

export interface AgentMcpToolProvider {
  callTool(args: Record<string, unknown>): Promise<string>;
  installMarketplaceServer(args: Record<string, unknown>): Promise<string>;
  listTools(): Promise<string>;
  previewInstallMarketplaceServer(args: Record<string, unknown>): Promise<string>;
  previewToolCall(args: Record<string, unknown>): Promise<string>;
  searchMarketplace(args: Record<string, unknown>): Promise<string>;
}

export class NativeAgentMcpToolProvider implements AgentMcpToolProvider {
  private readonly client: McpRuntimeClient;
  private readonly service: McpService;

  constructor(options: {
    readonly client?: McpRuntimeClient;
    readonly service: McpService;
  }) {
    this.client = options.client ?? new McpStdioRuntimeClient();
    this.service = options.service;
  }

  async listTools(): Promise<string> {
    const results = await Promise.all((await this.service.listEnabledServers()).map((server) => this.listServerTools(server)));
    const lines = results.flat();
    return lines.length === 0 ? "No enabled MCP tools are available." : lines.join("\n");
  }

  async callTool(args: Record<string, unknown>): Promise<string> {
    const server = await this.requireServer(readRequiredString(args, "server"));
    return this.client.callTool(server, readRequiredString(args, "tool"), readToolArguments(args));
  }

  async installMarketplaceServer(args: Record<string, unknown>): Promise<string> {
    return formatInstallResult(await this.service.installMarketplaceServer(readRequiredString(args, "id")));
  }

  async previewToolCall(args: Record<string, unknown>): Promise<string> {
    return [
      `MCP server: ${readRequiredString(args, "server")}`,
      `MCP tool: ${readRequiredString(args, "tool")}`,
      `Arguments:\n${JSON.stringify(readToolArguments(args), null, 2)}`
    ].join("\n");
  }

  async previewInstallMarketplaceServer(args: Record<string, unknown>): Promise<string> {
    return `Install MCP marketplace server: ${readRequiredString(args, "id")}`;
  }

  async searchMarketplace(args: Record<string, unknown>): Promise<string> {
    return formatMarketplaceServers(await this.service.searchMarketplace(readSearchRequest(args)));
  }

  private async listServerTools(server: McpServer): Promise<readonly string[]> {
    return (await this.client.listTools(server)).map((tool) => formatMcpTool(server, tool));
  }

  private async requireServer(name: string): Promise<McpServer> {
    const server = (await this.service.listEnabledServers()).find((item) => item.name === name);
    if (server === undefined) throw new Error(`Enabled MCP server not found: ${name}`);
    return server;
  }
}

export function createMcpToolSpecs(provider: AgentMcpToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "List tools exposed by enabled MCP services.",
      name: "mcp.list_tools",
      parameters: "none",
      permission: "read",
      run: () => requireProvider(provider).listTools()
    },
    {
      description: "Call a tool from an enabled MCP service.",
      name: "mcp.call_tool",
      parameters: "server: string, tool: string, arguments?: object",
      permission: "write",
      preview: (args) => requireProvider(provider).previewToolCall(args),
      run: (args) => requireProvider(provider).callTool(args)
    },
    {
      description: "Search Glama and MCP.so marketplace listings for MCP services.",
      name: "mcp.marketplace.search",
      parameters: "query?: string, source?: all|glama|mcp.so",
      permission: "read",
      run: (args) => requireProvider(provider).searchMarketplace(args)
    },
    {
      description: "Install an MCP marketplace server into Nexus.",
      name: "mcp.marketplace.install",
      parameters: "id: string",
      permission: "write",
      preview: (args) => requireProvider(provider).previewInstallMarketplaceServer(args),
      run: (args) => requireProvider(provider).installMarketplaceServer(args)
    }
  ];
}

function requireProvider(provider: AgentMcpToolProvider | undefined): AgentMcpToolProvider {
  if (provider === undefined) throw new Error("MCP tools are not configured.");
  return provider;
}

function readToolArguments(args: Record<string, unknown>): Record<string, unknown> {
  const value = args.arguments;
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readSearchRequest(args: Record<string, unknown>): McpSearchRequest {
  return {
    query: readOptionalString(args, "query"),
    source: readMarketplaceSource(args)
  };
}

function readMarketplaceSource(args: Record<string, unknown>): McpMarketplaceSource | undefined {
  const value = readOptionalString(args, "source");
  if (value === undefined || value === "all" || value === "glama" || value === "mcp.so") return value;
  throw new Error(`Unsupported MCP marketplace source: ${value}`);
}

function formatMarketplaceServers(servers: readonly McpMarketplaceServer[]): string {
  if (servers.length === 0) return "No MCP marketplace servers found.";
  return servers.map(formatMarketplaceServer).join("\n\n");
}

function formatMarketplaceServer(server: McpMarketplaceServer): string {
  return [
    `${server.id} [${server.source}] ${server.name}`,
    `installable: ${server.installable}`,
    `installed: ${server.installed}`,
    `type: ${server.type}`,
    server.command === undefined ? "" : `command: ${server.command} ${server.args.join(" ")}`.trimEnd(),
    server.url === undefined ? "" : `url: ${server.url}`,
    server.description === "" ? "" : `description: ${server.description}`,
    server.installError === undefined ? "" : `installError: ${server.installError}`
  ].filter(Boolean).join("\n");
}

function formatInstallResult(result: InstallResult): string {
  return [`success: ${result.success}`, result.message].join("\n");
}

function formatMcpTool(server: McpServer, tool: McpRuntimeTool): string {
  return `${server.name}.${tool.name}: ${tool.description ?? "No description."}`;
}
