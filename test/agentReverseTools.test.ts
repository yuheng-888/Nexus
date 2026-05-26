import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "../src/contracts.js";
import type { AgentModelClient, AgentModelRequest, AgentModelResponse } from "../src/main/agentModelClient.js";
import { AgentRuntimeService } from "../src/main/agentRuntimeService.js";
import { NativeAgentToolRunner } from "../src/main/agentTools.js";
import { ApiConfigService } from "../src/main/apiConfigService.js";
import { FileService } from "../src/main/fileService.js";
import { GitService } from "../src/main/gitService.js";
import { ReverseService } from "../src/main/reverseService.js";
import { SearchService } from "../src/main/searchService.js";
import type { PtyFactory, PtyProcess } from "../src/main/sessionManager.js";
import { SessionManager } from "../src/main/sessionManager.js";

const WAIT_ATTEMPTS = 20;
const WAIT_DELAY_MS = 10;

class FakeModelClient implements AgentModelClient {
  requests: AgentModelRequest[] = [];

  async complete(request: AgentModelRequest): Promise<AgentModelResponse> {
    this.requests = [...this.requests, request];
    return { text: "reverse context received" };
  }
}

class ThrowingPtyFactory implements PtyFactory {
  spawn(): PtyProcess {
    throw new Error("native reverse tools must not spawn a CLI process");
  }
}

describe("agent reverse tools", () => {
  it("runs reverse detection and JavaScript scan as native startup tools", async () => {
    const workspaceRoot = await createReverseWorkspace();
    const runner = new NativeAgentToolRunner({ reverse: new ReverseService() });

    const results = await runner.runStartupTools({
      cwd: ".",
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      prompt: "检查这个 Electron 项目的危险调用",
      search: new SearchService({ workspaceRoot }),
      workspaceRoot
    });
    const output = results.map((result) => `${result.name}\n${result.output}`).join("\n\n");

    expect(results.map((result) => result.name)).toEqual(expect.arrayContaining([
      "reverse.detect_target",
      "reverse.scan_javascript"
    ]));
    expect(output).toContain("node-project");
    expect(output).toContain("dynamic-execution");
    expect(output).toContain("child-process");
    expect(output).toContain("Scanned 1 JS/TS files");
  });

  it("injects reverse tool output into model requests", async () => {
    const workspaceRoot = await createReverseWorkspace();
    const exits: number[] = [];
    const modelClient = new FakeModelClient();
    const runtime = new AgentRuntimeService({
      apiConfig: configuredApi(workspaceRoot),
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient,
      reverse: new ReverseService(),
      search: new SearchService({ workspaceRoot }),
      sessions: new SessionManager({
        onData: () => {},
        onExit: (_sessionId, exit) => exits.push(exit.exitCode),
        ptyFactory: new ThrowingPtyFactory()
      })
    });

    runtime.start({
      kind: "agent",
      prompt: "这个项目有什么逆向分析线索？",
      workspaceRoot
    });

    await waitForExit(exits);
    const requestText = modelClient.requests[0]?.messages.map((message) => message.content).join("\n");

    expect(requestText).toContain("reverse.detect_target");
    expect(requestText).toContain("reverse.scan_javascript");
    expect(requestText).toContain("node-project");
    expect(requestText).toContain("dynamic-execution");
  });
});

async function createReverseWorkspace(): Promise<string> {
  const root = join(tmpdir(), `nexus-agent-reverse-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ main: "main.js", name: "reverse-demo" }));
  await writeFile(join(root, "main.js"), "const cp = require('child_process');\neval('cp.exec(\"id\")');\n");
  return root;
}

function configuredApi(workspaceRoot: string): ApiConfigService {
  const service = new ApiConfigService({ storePath: join(workspaceRoot, "api-configs.json") });
  service.updateConfig("anthropic-default", { apiKey: "test-key" } as Partial<ApiConfig>);
  return service;
}

async function waitForExit(exits: readonly number[]): Promise<void> {
  for (let attempt = 0; attempt < WAIT_ATTEMPTS; attempt += 1) {
    if (exits.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_DELAY_MS));
  }

  throw new Error("runtime session did not exit");
}
