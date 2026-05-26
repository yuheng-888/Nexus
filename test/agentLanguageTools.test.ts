import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

class FakeLanguageProvider {
  calls: Record<string, unknown>[] = [];

  async definition(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "src/util.ts:1:14-1:21";
  }

  async diagnostics(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "error src/app.ts:1:7 Type 'string' is not assignable";
  }

  async documentSymbols(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "function render 3:1-5:2";
  }

  async hover(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "const meaning: 42";
  }

  async references(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "src/app.ts:2:16-2:23";
  }
}

describe("NativeAgentInteractiveToolRunner language tools", () => {
  it("exposes diagnostics and document symbols as read-only native tools", async () => {
    const provider = new FakeLanguageProvider();
    const runner = new NativeAgentInteractiveToolRunner({ languages: provider });

    const diagnostics = await runner.runToolCall(toolCall("languages.diagnostics", { path: "src/app.ts" }), fakeContext());
    const symbols = await runner.runToolCall(toolCall("languages.document_symbols", { path: "src/app.ts" }), fakeContext());

    expect(runner.getToolDefinition("languages.diagnostics")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("languages.document_symbols")).toMatchObject({ permission: "read" });
    expect(diagnostics).toEqual({
      name: "languages.diagnostics",
      ok: true,
      output: "error src/app.ts:1:7 Type 'string' is not assignable"
    });
    expect(symbols).toEqual({ name: "languages.document_symbols", ok: true, output: "function render 3:1-5:2" });
  });

  it("exposes position-based code intelligence as read-only native tools", async () => {
    const provider = new FakeLanguageProvider();
    const runner = new NativeAgentInteractiveToolRunner({ languages: provider });
    const args = { character: 11, line: 1, path: "src/app.ts" };

    const definition = await runner.runToolCall(toolCall("languages.definition", args), fakeContext());
    const references = await runner.runToolCall(toolCall("languages.references", args), fakeContext());
    const hover = await runner.runToolCall(toolCall("languages.hover", args), fakeContext());

    expect(runner.getToolDefinition("languages.definition")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("languages.references")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("languages.hover")).toMatchObject({ permission: "read" });
    expect(definition.output).toBe("src/util.ts:1:14-1:21");
    expect(references.output).toBe("src/app.ts:2:16-2:23");
    expect(hover.output).toBe("const meaning: 42");
    expect(provider.calls).toContainEqual(args);
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
