import type { McpServer } from "../contracts.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readRequiredString } from "./agentToolArgs.js";
import type { McpService } from "./mcpService.js";
import { McpStdioRuntimeClient, type McpRuntimeClient, type McpRuntimeTool } from "./mcpStdioRuntimeClient.js";

export interface AgentMcpToolProvider {
  callTool(args: Record<string, unknown>): Promise<string>;
  listTools(): Promise<string>;
  previewToolCall(args: Record<string, unknown>): Promise<string>;
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

  async previewToolCall(args: Record<string, unknown>): Promise<string> {
    return [
      `MCP server: ${readRequiredString(args, "server")}`,
      `MCP tool: ${readRequiredString(args, "tool")}`,
      `Arguments:\n${JSON.stringify(readToolArguments(args), null, 2)}`
    ].join("\n");
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

function formatMcpTool(server: McpServer, tool: McpRuntimeTool): string {
  return `${server.name}.${tool.name}: ${tool.description ?? "No description."}`;
}
