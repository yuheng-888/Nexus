import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GitCommandResult } from "../src/gitContracts.js";
import type { WorkflowCommandRunner, WorkflowCommandRunOptions } from "../src/main/workflowCommandRunner.js";
import { WorkflowService } from "../src/main/workflowService.js";
import { WorkflowStore } from "../src/main/workflowStore.js";
import type { RagIndexSummary } from "../src/ragContracts.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "nexus-workflows-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("WorkflowService", () => {
  it("lists built-in native macros", async () => {
    const service = createService();

    const workflows = await service.listDefinitions();

    expect(workflows.map((workflow) => workflow.id)).toEqual(expect.arrayContaining([
      "nexus.rag.build-index",
      "nexus.git.snapshot",
      "nexus.ai.review"
    ]));
    expect(workflows.every((workflow) => workflow.steps.length > 0)).toBe(true);
  });

  it("persists user workflow definitions", async () => {
    const storePath = join(root, "workflows.json");
    const service = createService({ storePath });

    const saved = await service.saveDefinition({
      description: "Run tests",
      name: "Test Macro",
      steps: [{ command: "npm test", id: "test", name: "Run tests", type: "command" }]
    });
    const restored = createService({ storePath });

    await expect(restored.getDefinition(saved.id)).resolves.toMatchObject({
      id: saved.id,
      name: "Test Macro"
    });
  });

  it("runs command, git, rag, and todo steps in order", async () => {
    const service = createService();
    const saved = await service.saveDefinition({
      name: "Native Macro",
      steps: [
        { command: "echo {{prompt}}", id: "cmd", name: "Command", type: "command" },
        { id: "git", name: "Git status", operation: "status", type: "git" },
        { id: "rag", name: "RAG status", operation: "status", type: "rag" },
        { id: "todo", name: "Todos", todos: [{ content: "ship", status: "pending" }], type: "todo" }
      ]
    });

    const run = await service.run({ input: { prompt: "hello" }, workflowId: saved.id });

    expect(run.status).toBe("completed");
    expect(run.stepResults.map((step) => step.status)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed"
    ]);
    expect(run.stepResults[0]?.output).toContain("hello");
  });

  it("stops after a failing command step with explicit evidence", async () => {
    const service = createService({ commandResult: { exitCode: 2, stderr: "boom", stdout: "" } });
    const saved = await service.saveDefinition({
      name: "Fail Fast",
      steps: [
        { command: "false", id: "fail", name: "Fail", type: "command" },
        { id: "skipped", name: "Skipped", operation: "status", type: "git" }
      ]
    });

    const run = await service.run({ workflowId: saved.id });

    expect(run.status).toBe("failed");
    expect(run.error).toContain("Command failed with exit code 2");
    expect(run.stepResults).toHaveLength(1);
    expect(run.stepResults[0]).toMatchObject({
      error: expect.stringContaining("boom"),
      status: "failed"
    });
  });
});

function createService(options: {
  readonly commandResult?: GitCommandResult;
  readonly storePath?: string;
} = {}): WorkflowService {
  return new WorkflowService({
    commandRunner: new FakeCommandRunner(options.commandResult),
    git: new FakeGitService(),
    rag: new FakeRagService(),
    store: new WorkflowStore({ storePath: options.storePath ?? join(root, "store.json") }),
    subagents: new FakeSubagentService(),
    workspaceRoot: root
  });
}

class FakeCommandRunner implements WorkflowCommandRunner {
  private readonly result: GitCommandResult;

  constructor(result: GitCommandResult = { exitCode: 0, stderr: "", stdout: "ok" }) {
    this.result = result;
  }

  async run(options: WorkflowCommandRunOptions): Promise<GitCommandResult> {
    if (this.result.stdout !== "ok") return this.result;
    return { ...this.result, stdout: options.command };
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
