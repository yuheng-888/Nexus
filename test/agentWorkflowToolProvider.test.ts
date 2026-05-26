import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GitCommandResult } from "../src/gitContracts.js";
import { NativeAgentWorkflowToolProvider } from "../src/main/agentWorkflowTools.js";
import type { WorkflowCommandRunner, WorkflowCommandRunOptions } from "../src/main/workflowCommandRunner.js";
import { WorkflowService } from "../src/main/workflowService.js";
import { WorkflowStore } from "../src/main/workflowStore.js";
import type { RagIndexSummary } from "../src/ragContracts.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "nexus-agent-workflows-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("NativeAgentWorkflowToolProvider", () => {
  it("formats workflow discovery, previews, and run results", async () => {
    const service = createService();
    const provider = new NativeAgentWorkflowToolProvider({ service });
    const saved = await service.saveDefinition({
      name: "Ship Macro",
      steps: [{ id: "todo", name: "Plan", todos: [{ content: "ship", status: "pending" }], type: "todo" }]
    });

    const list = await provider.listWorkflows();
    const preview = await provider.previewRunWorkflow({ workflowId: saved.id });
    const run = await provider.runWorkflow({ prompt: "release", variables: { target: "Nexus" }, workflowId: saved.id });

    expect(list).toContain("Ship Macro");
    expect(preview).toContain(`Run workflow: Ship Macro (${saved.id})`);
    expect(run).toContain("completed");
    expect(run).toContain("workflow: Ship Macro");
    expect(run).toContain("- completed todo Plan");
  });
});

function createService(): WorkflowService {
  return new WorkflowService({
    commandRunner: new FakeCommandRunner(),
    git: new FakeGitService(),
    rag: new FakeRagService(),
    store: new WorkflowStore({ storePath: join(root, "store.json") }),
    subagents: new FakeSubagentService(),
    workspaceRoot: root
  });
}

class FakeCommandRunner implements WorkflowCommandRunner {
  async run(options: WorkflowCommandRunOptions): Promise<GitCommandResult> {
    return { exitCode: 0, stderr: "", stdout: options.command };
  }
}

class FakeGitService {
  async status(): Promise<GitCommandResult> {
    return { exitCode: 0, stderr: "", stdout: "## main\n" };
  }
}

class FakeRagService {
  async buildIndex(): Promise<RagIndexSummary> {
    return {
      builtAt: 1,
      indexed: true,
      indexedChunks: 1,
      indexedFiles: 1,
      indexPath: "/tmp/index.json",
      skippedFiles: [],
      workspaceRoot: root
    };
  }

  async status(): Promise<object> {
    return { indexed: false };
  }
}

class FakeSubagentService {
  start(): object {
    return { id: "agent-run", status: "running" };
  }
}
