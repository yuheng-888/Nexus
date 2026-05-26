import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";

class FakeTestProvider {
  calls: Record<string, unknown>[] = [];

  async discoverTests(): Promise<string> {
    return "npm test\nsrc/app.test.ts";
  }

  async previewRunTests(args: Record<string, unknown>): Promise<string> {
    return `Run tests: ${String(args.scope)}`;
  }

  async runTests(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "passed\n2 passed";
  }
}

describe("NativeAgentInteractiveToolRunner test tools", () => {
  it("discovers tests as a read-only native tool", async () => {
    const provider = new FakeTestProvider();
    const runner = new NativeAgentInteractiveToolRunner({ tests: provider });

    const result = await runner.runToolCall(toolCall("tests.discover", {}), fakeContext());

    expect(runner.getToolDefinition("tests.discover")).toMatchObject({ permission: "read" });
    expect(result).toEqual({
      name: "tests.discover",
      ok: true,
      output: "npm test\nsrc/app.test.ts"
    });
  });

  it("marks test execution as an approval-gated write tool", async () => {
    const provider = new FakeTestProvider();
    const runner = new NativeAgentInteractiveToolRunner({ tests: provider });
    const call = toolCall("tests.run", { path: "src/app.test.ts", scope: "file" });

    const definition = runner.getToolDefinition("tests.run");
    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(definition).toMatchObject({ permission: "write" });
    expect(preview).toBe("Run tests: file");
    expect(result).toEqual({ name: "tests.run", ok: true, output: "passed\n2 passed" });
    expect(provider.calls).toEqual([{ path: "src/app.test.ts", scope: "file" }]);
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
