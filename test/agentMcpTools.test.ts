import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentMcpToolProvider } from "../src/main/agentMcpTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";

class FakeMcpProvider implements AgentMcpToolProvider {
  calls: Record<string, unknown>[] = [];

  async callTool(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "clicked current browser tab";
  }

  async listTools(): Promise<string> {
    return "chrome-mcp.click: Click the current browser page.";
  }

  async previewToolCall(args: Record<string, unknown>): Promise<string> {
    return `MCP call ${String(args.server)}.${String(args.tool)}`;
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
