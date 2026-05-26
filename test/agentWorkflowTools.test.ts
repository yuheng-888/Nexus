import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

class FakeWorkflowProvider {
  calls: Record<string, unknown>[] = [];

  async listWorkflows(): Promise<string> {
    return "nexus.git.snapshot [builtin]\nsteps: 2";
  }

  async previewRunWorkflow(args: Record<string, unknown>): Promise<string> {
    return `Run workflow: ${String(args.workflowId)}`;
  }

  async runWorkflow(args: Record<string, unknown>): Promise<string> {
    this.calls = [...this.calls, args];
    return "completed\nworkflow: Git Snapshot\nsteps: 2";
  }
}

describe("NativeAgentInteractiveToolRunner workflow tools", () => {
  it("lists workflows as a read-only native tool", async () => {
    const provider = new FakeWorkflowProvider();
    const runner = new NativeAgentInteractiveToolRunner({ workflows: provider });

    const result = await runner.runToolCall(toolCall("workflows.list", {}), fakeContext());

    expect(runner.getToolDefinition("workflows.list")).toMatchObject({ permission: "read" });
    expect(result).toEqual({
      name: "workflows.list",
      ok: true,
      output: "nexus.git.snapshot [builtin]\nsteps: 2"
    });
  });

  it("marks workflow execution as an approval-gated write tool", async () => {
    const provider = new FakeWorkflowProvider();
    const runner = new NativeAgentInteractiveToolRunner({ workflows: provider });
    const call = toolCall("workflows.run", { prompt: "review diff", workflowId: "nexus.ai.review" });

    const definition = runner.getToolDefinition("workflows.run");
    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(definition).toMatchObject({ permission: "write" });
    expect(preview).toBe("Run workflow: nexus.ai.review");
    expect(result).toEqual({ name: "workflows.run", ok: true, output: "completed\nworkflow: Git Snapshot\nsteps: 2" });
    expect(provider.calls).toEqual([{ prompt: "review diff", workflowId: "nexus.ai.review" }]);
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
