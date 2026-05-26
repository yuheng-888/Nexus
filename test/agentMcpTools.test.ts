import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentMcpToolProvider } from "../src/main/agentMcpTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";

class FakeMcpProvider implements AgentMcpToolProvider {
  calls: Record<string, unknown>[] = [];
  installArgs: Record<string, unknown>[] = [];

  async callTool(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "clicked current browser tab";
  }

  async installMarketplaceServer(args: Record<string, unknown>): Promise<string> {
    this.installArgs = [...this.installArgs, args];
    return "success: true\nMCP 服务 crawlio-browser 已安装";
  }

  async listTools(): Promise<string> {
    return "chrome-mcp.click: Click the current browser page.";
  }

  async previewInstallMarketplaceServer(args: Record<string, unknown>): Promise<string> {
    return `Install MCP marketplace server: ${String(args.id)}`;
  }

  async previewToolCall(args: Record<string, unknown>): Promise<string> {
    return `MCP call ${String(args.server)}.${String(args.tool)}`;
  }

  async searchMarketplace(args: Record<string, unknown>): Promise<string> {
    return `mcp.so:crawlio-browser [mcp.so]\nquery: ${String(args.query)}`;
  }
}

describe("NativeAgentInteractiveToolRunner MCP tools", () => {
  it("lists enabled MCP tools for the agent", async () => {
    const provider = new FakeMcpProvider();
    const runner = new NativeAgentInteractiveToolRunner({ mcp: provider });

    const result = await runner.runToolCall(toolCall("mcp.list_tools", {}), fakeContext());

    expect(result).toEqual({
      name: "mcp.list_tools",
      ok: true,
      output: "chrome-mcp.click: Click the current browser page."
    });
  });

  it("marks MCP calls as approval-gated write tools", async () => {
    const provider = new FakeMcpProvider();
    const runner = new NativeAgentInteractiveToolRunner({ mcp: provider });
    const definition = runner.getToolDefinition("mcp.call_tool");
    const call = toolCall("mcp.call_tool", { arguments: { x: 1 }, server: "chrome-mcp", tool: "click" });

    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(definition).toMatchObject({ name: "mcp.call_tool", permission: "write" });
    expect(preview).toBe("MCP call chrome-mcp.click");
    expect(result).toEqual({
      name: "mcp.call_tool",
      ok: true,
      output: "clicked current browser tab"
    });
    expect(provider.calls).toEqual([{ arguments: { x: 1 }, server: "chrome-mcp", tool: "click" }]);
  });

  it("searches and installs MCP marketplace servers for the agent", async () => {
    const provider = new FakeMcpProvider();
    const runner = new NativeAgentInteractiveToolRunner({ mcp: provider });
    const install = toolCall("mcp.marketplace.install", { id: "mcp.so:crawlio-browser" });

    const search = await runner.runToolCall(toolCall("mcp.marketplace.search", { query: "browser", source: "mcp.so" }), fakeContext());
    const preview = await runner.previewToolCall(install, fakeContext());
    const result = await runner.runToolCall(install, fakeContext());

    expect(runner.getToolDefinition("mcp.marketplace.search")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("mcp.marketplace.install")).toMatchObject({ permission: "write" });
    expect(search.output).toContain("mcp.so:crawlio-browser");
    expect(preview).toBe("Install MCP marketplace server: mcp.so:crawlio-browser");
    expect(result).toEqual({ name: "mcp.marketplace.install", ok: true, output: "success: true\nMCP 服务 crawlio-browser 已安装" });
    expect(provider.installArgs).toEqual([{ id: "mcp.so:crawlio-browser" }]);
  });
});

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}

function fakeContext(): AgentInteractiveToolContext {
  return {
    cwd: ".",
    files: {} as AgentInteractiveToolContext["files"],
    git: {} as AgentInteractiveToolContext["git"],
    prompt: "",
    search: {} as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}
