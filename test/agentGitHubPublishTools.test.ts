import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

class FakeGitHubPublishProvider {
  publishArgs: Record<string, unknown>[] = [];

  async publishRepository(args: Record<string, unknown>): Promise<string> {
    this.publishArgs = [...this.publishArgs, args];
    return "published\nrepository: nexus/demo\nbranch: main";
  }

  async publishSafetyScan(): Promise<string> {
    return "blocked: false\ncheckedFiles: 12";
  }

  async previewPublishRepository(args: Record<string, unknown>): Promise<string> {
    return `Publish GitHub repository: ${String(args.name)}`;
  }
}

describe("NativeAgentInteractiveToolRunner GitHub publish tools", () => {
  it("runs publish safety scan as a read-only native tool", async () => {
    const provider = new FakeGitHubPublishProvider();
    const runner = new NativeAgentInteractiveToolRunner({ gitHubPublish: provider });

    const result = await runner.runToolCall(toolCall("github.publish_safety_scan", {}), fakeContext());

    expect(runner.getToolDefinition("github.publish_safety_scan")).toMatchObject({ permission: "read" });
    expect(result).toEqual({
      name: "github.publish_safety_scan",
      ok: true,
      output: "blocked: false\ncheckedFiles: 12"
    });
  });

  it("marks repository publishing as an approval-gated write tool", async () => {
    const provider = new FakeGitHubPublishProvider();
    const runner = new NativeAgentInteractiveToolRunner({ gitHubPublish: provider });
    const call = toolCall("github.publish_repository", { name: "demo", token: "test-token", visibility: "public" });

    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(runner.getToolDefinition("github.publish_repository")).toMatchObject({ permission: "write" });
    expect(preview).toBe("Publish GitHub repository: demo");
    expect(result).toEqual({ name: "github.publish_repository", ok: true, output: "published\nrepository: nexus/demo\nbranch: main" });
    expect(provider.publishArgs).toEqual([{ name: "demo", token: "test-token", visibility: "public" }]);
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
