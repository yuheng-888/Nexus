import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";

describe("NativeAgentInteractiveToolRunner search replace tools", () => {
  it("previews replacements as a read-only native tool", async () => {
    const runner = new NativeAgentInteractiveToolRunner();
    const context = fakeContext();

    const result = await runner.runToolCall(toolCall("workspace.replace_preview", {
      query: "Nexus",
      replacement: "Nexus IDE"
    }), context);

    expect(runner.getToolDefinition("workspace.replace_preview")).toMatchObject({ permission: "read" });
    expect(result).toEqual({
      name: "workspace.replace_preview",
      ok: true,
      output: "2 matches in 1 files\nsrc/app.ts (2)\n1: const name = 'Nexus';\n=> const name = 'Nexus IDE';"
    });
  });

  it("marks applying replacements as an approval-gated write tool", async () => {
    const runner = new NativeAgentInteractiveToolRunner();
    const context = fakeContext();
    const call = toolCall("workspace.replace_all", { query: "Nexus", replacement: "Nexus IDE" });

    const definition = runner.getToolDefinition("workspace.replace_all");
    const preview = await runner.previewToolCall(call, context);
    const result = await runner.runToolCall(call, context);

    expect(definition).toMatchObject({ permission: "write" });
    expect(preview).toContain("2 matches in 1 files");
    expect(result).toEqual({
      name: "workspace.replace_all",
      ok: true,
      output: "Replaced 2 matches in 1 files\nsrc/app.ts"
    });
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
    search: {
      applyReplace: async () => ({ filesChanged: 1, paths: ["src/app.ts"], totalMatches: 2 }),
      previewReplace: async () => ({
        files: [{
          matches: 2,
          path: "src/app.ts",
          previews: [{
            after: "const name = 'Nexus IDE';",
            before: "const name = 'Nexus';",
            line: 1
          }]
        }],
        totalMatches: 2
      })
    } as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}
