import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

class FakeScriptProvider {
  calls: Record<string, unknown>[] = [];

  async discoverScripts(): Promise<string> {
    return "packageManager: npm\nscripts: 1\nbuild: tsc -p tsconfig.json";
  }

  async previewRunScript(args: Record<string, unknown>): Promise<string> {
    return `Run script: ${String(args.name)}`;
  }

  async runScript(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "passed\ncommand: npm run build";
  }
}

describe("NativeAgentInteractiveToolRunner script tools", () => {
  it("discovers npm scripts as a read-only native tool", async () => {
    const provider = new FakeScriptProvider();
    const runner = new NativeAgentInteractiveToolRunner({ scripts: provider });

    const result = await runner.runToolCall(toolCall("scripts.discover", {}), fakeContext());

    expect(runner.getToolDefinition("scripts.discover")).toMatchObject({ permission: "read" });
    expect(result).toEqual({
      name: "scripts.discover",
      ok: true,
      output: "packageManager: npm\nscripts: 1\nbuild: tsc -p tsconfig.json"
    });
  });

  it("marks npm script execution as an approval-gated write tool", async () => {
    const provider = new FakeScriptProvider();
    const runner = new NativeAgentInteractiveToolRunner({ scripts: provider });
    const call = toolCall("scripts.run", { name: "build" });

    const definition = runner.getToolDefinition("scripts.run");
    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(definition).toMatchObject({ permission: "write" });
    expect(preview).toBe("Run script: build");
    expect(result).toEqual({ name: "scripts.run", ok: true, output: "passed\ncommand: npm run build" });
    expect(provider.calls).toEqual([{ name: "build" }]);
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
