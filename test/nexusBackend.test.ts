import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WorkspaceInfo } from "../src/contracts.js";
import type { AgentModelClient, AgentModelRequest, AgentModelResponse } from "../src/main/agentModelClient.js";
import type { AgentToolRunner } from "../src/main/agentTools.js";
import { ApiConfigService } from "../src/main/apiConfigService.js";
import { NexusBackend } from "../src/main/nexusBackend.js";
import type { PtyFactory, PtyProcess } from "../src/main/sessionManager.js";
import { SessionManager } from "../src/main/sessionManager.js";

const WAIT_ATTEMPTS = 20;
const WAIT_DELAY_MS = 10;

describe("NexusBackend", () => {
  it("starts the main assistant through the native runtime", async () => {
    const exits: number[] = [];
    const backend = new NexusBackend(workspace(), new SessionManager({
      onData: () => {},
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: new ThrowingPtyFactory()
    }), {
      apiConfig: await testApiConfig(),
      modelClient: new FakeModelClient(),
      toolRunner: fakeToolRunner()
    });

    backend.apiConfig.updateConfig("anthropic-default", { apiKey: "test-key" });

    const session = backend.startAgent({ prompt: "summarize" });
    await waitForExit(exits);

    expect(session.command).toBe("nexus-agent-runtime");
    expect(session.args.join(" ")).not.toMatch(/claude|codex|cli\.js|node/i);
  });

  it("starts the main assistant without an open workspace", async () => {
    const exits: number[] = [];
    const backend = new NexusBackend(workspace(null), new SessionManager({
      onData: () => {},
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: new ThrowingPtyFactory()
    }), {
      apiConfig: await testApiConfig(),
      modelClient: new FakeModelClient(),
      toolRunner: throwingToolRunner()
    });

    backend.apiConfig.updateConfig("anthropic-default", { apiKey: "test-key" });

    const session = backend.startAgent({ prompt: "你好" });
    await waitForExit(exits);

    expect(session.cwd).toBe(process.cwd());
    expect(exits).toEqual([0]);
  });

  it("starts a subagent without an open workspace", async () => {
    const exits: number[] = [];
    const backend = new NexusBackend(workspace(null), new SessionManager({
      onData: () => {},
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: new ThrowingPtyFactory()
    }), {
      apiConfig: await testApiConfig(),
      modelClient: new FakeModelClient(),
      toolRunner: throwingToolRunner()
    });

    backend.apiConfig.updateConfig("anthropic-default", { apiKey: "test-key" });

    const run = backend.startSubagent({ profileId: "reviewer", prompt: "检查一下" });
    await waitForExit(exits);

    expect(run.session.cwd).toBe(process.cwd());
    expect(exits).toEqual([0]);
  });

  it("records opened workspaces for restart restore", async () => {
    const stateStore = new RecordingWorkspaceStateStore();
    const backend = new NexusBackend(workspace(null), sessionManager(), {
      workspaceState: stateStore
    });

    backend.setWorkspaceRoot("/workspace/project");

    expect(stateStore.opened).toEqual(["/workspace/project"]);
    expect(backend.getWorkspace()).toEqual({ root: "/workspace/project" });
  });

  it("lists and opens recent workspaces", async () => {
    const stateStore = new RecordingWorkspaceStateStore([
      "/workspace/project-a",
      "/workspace/project-b"
    ]);
    const backend = new NexusBackend(workspace(null), sessionManager(), {
      workspaceState: stateStore
    });

    expect(backend.getRecentWorkspaces()).toEqual([
      "/workspace/project-a",
      "/workspace/project-b"
    ]);
    expect(backend.openRecentWorkspace("/workspace/project-b")).toEqual({
      root: "/workspace/project-b"
    });
    expect(stateStore.opened).toEqual(["/workspace/project-b"]);
  });
});

function workspace(root: string | null = "/workspace"): WorkspaceInfo {
  return {
    root
  };
}

function sessionManager(): SessionManager {
  return new SessionManager({
    onData: () => {},
    onExit: () => {},
    ptyFactory: new ThrowingPtyFactory()
  });
}

class RecordingWorkspaceStateStore {
  readonly opened: string[] = [];
  private readonly recentWorkspaceRoots: readonly string[];

  constructor(recentWorkspaceRoots: readonly string[] = []) {
    this.recentWorkspaceRoots = recentWorkspaceRoots;
  }

  load() {
    return {
      lastWorkspaceRoot: this.recentWorkspaceRoots[0] ?? null,
      recentWorkspaceRoots: this.recentWorkspaceRoots
    };
  }

  recordOpened(workspaceRoot: string): void {
    this.opened.push(workspaceRoot);
  }
}

class FakeModelClient implements AgentModelClient {
  async complete(_request: AgentModelRequest): Promise<AgentModelResponse> {
    return { text: "ok" };
  }
}

class ThrowingPtyFactory implements PtyFactory {
  spawn(): PtyProcess {
    throw new Error("backend assistant must not spawn a CLI process");
  }
}

function fakeToolRunner(): AgentToolRunner {
  return {
    runStartupTools: async () => []
  };
}

function throwingToolRunner(): AgentToolRunner {
  return {
    runStartupTools: async () => {
      throw new Error("startup tools require an open workspace");
    }
  };
}

async function testApiConfig(): Promise<ApiConfigService> {
  const root = await mkdtemp(join(tmpdir(), "nexus-backend-api-"));
  return new ApiConfigService({ storePath: join(root, "api-configs.json") });
}

async function waitForExit(exits: readonly number[]): Promise<void> {
  for (let attempt = 0; attempt < WAIT_ATTEMPTS; attempt += 1) {
    if (exits.length > 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, WAIT_DELAY_MS));
  }

  throw new Error("runtime session did not exit");
}
