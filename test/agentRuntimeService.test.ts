import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "../src/contracts.js";
import { ApiConfigService } from "../src/main/apiConfigService.js";
import type { AgentModelClient, AgentModelRequest, AgentModelResponse } from "../src/main/agentModelClient.js";
import { AgentRuntimeService } from "../src/main/agentRuntimeService.js";
import type { AgentToolRunner } from "../src/main/agentTools.js";
import { ConversationService } from "../src/main/conversationService.js";
import { FileService } from "../src/main/fileService.js";
import { GitService } from "../src/main/gitService.js";
import { RagService } from "../src/main/ragService.js";
import { SearchService } from "../src/main/searchService.js";
import type { PtyFactory, PtyProcess } from "../src/main/sessionManager.js";
import { SessionManager } from "../src/main/sessionManager.js";

const WAIT_ATTEMPTS = 20;
const WAIT_DELAY_MS = 10;

class FakeModelClient implements AgentModelClient {
  requests: AgentModelRequest[] = [];

  async complete(request: AgentModelRequest): Promise<AgentModelResponse> {
    this.requests = [...this.requests, request];
    return { text: "native response", usage: { outputTokens: 2 } };
  }
}

class ThrowingPtyFactory implements PtyFactory {
  spawn(): PtyProcess {
    throw new Error("native agent runtime must not spawn a CLI process");
  }
}

describe("AgentRuntimeService", () => {
  it("runs agent sessions inside Nexus without spawning Claude or Codex CLI", async () => {
    const workspaceRoot = await createWorkspace();
    const events: string[] = [];
    const exits: number[] = [];
    const modelClient = new FakeModelClient();
    const sessions = new SessionManager({
      onData: (_sessionId, data) => events.push(data),
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: new ThrowingPtyFactory()
    });
    const runtime = new AgentRuntimeService({
      apiConfig: configuredApi(workspaceRoot),
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient,
      search: new SearchService({ workspaceRoot }),
      sessions,
      toolRunner: fakeToolRunner()
    });

    const session = runtime.start({
      cwd: ".",
      kind: "agent",
      model: "gpt-5-codex",
      prompt: "explain this project",
      workspaceRoot
    });

    await waitForExit(exits);

    expect(session.command).toBe("nexus-agent-runtime");
    expect(session.args.join(" ")).not.toMatch(/claude|codex|cli\.js|node/i);
    expect(session.kind).toBe("agent");
    expect(exits).toEqual([0]);
    expect(modelClient.requests[0]?.config.model).toBe("gpt-5-codex");
    expect(events.join("")).toContain("native response");
  });

  it("fails explicitly before creating a session when no API key is configured", async () => {
    const workspaceRoot = await createWorkspace();
    const runtime = new AgentRuntimeService({
      apiConfig: new ApiConfigService({ storePath: join(workspaceRoot, "api-configs.json") }),
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient: new FakeModelClient(),
      search: new SearchService({ workspaceRoot }),
      sessions: new SessionManager({
        onData: () => {},
        onExit: () => {},
        ptyFactory: new ThrowingPtyFactory()
      }),
      toolRunner: fakeToolRunner()
    });

    expect(() =>
      runtime.start({
        kind: "agent",
        prompt: "hello",
        workspaceRoot
      })
    ).toThrow(/API Key/);
  });

  it("persists assistant runs and sends previous conversation context to the model", async () => {
    const workspaceRoot = await createWorkspace();
    const exits: number[] = [];
    const modelClient = new FakeModelClient();
    const conversations = new ConversationService({
      storePath: join(workspaceRoot, "conversations.json")
    });
    await conversations.appendMessage("main", {
      content: "The project codename is Nexus",
      role: "user"
    });
    const runtime = new AgentRuntimeService({
      apiConfig: configuredApi(workspaceRoot),
      conversations,
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient,
      search: new SearchService({ workspaceRoot }),
      sessions: new SessionManager({
        onData: () => {},
        onExit: (_sessionId, exit) => exits.push(exit.exitCode),
        ptyFactory: new ThrowingPtyFactory()
      }),
      toolRunner: fakeToolRunner()
    });

    runtime.start({
      conversationId: "main",
      kind: "agent",
      prompt: "What is the codename?",
      workspaceRoot
    });

    await waitForExit(exits);
    const requestText = modelClient.requests[0]?.messages.map((message) => message.content).join("\n");
    const conversation = await conversations.getConversation("main");

    expect(requestText).toContain("The project codename is Nexus");
    expect(requestText).toContain("What is the codename?");
    expect(conversation.messages.at(-1)).toMatchObject({
      content: "native response",
      role: "assistant"
    });
  });

  it("injects local RAG context into native agent requests", async () => {
    const workspaceRoot = await createWorkspace();
    await writeFile(join(workspaceRoot, "apiConfigStore.ts"), "export const modelPersistence = 'api config store';\n");
    const exits: number[] = [];
    const modelClient = new FakeModelClient();
    const rag = new RagService({
      indexRoot: join(workspaceRoot, ".nexus-test-indexes"),
      workspaceRoot
    });
    await rag.buildIndex();
    const runtime = new AgentRuntimeService({
      apiConfig: configuredApi(workspaceRoot),
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient,
      rag,
      search: new SearchService({ workspaceRoot }),
      sessions: new SessionManager({
        onData: () => {},
        onExit: (_sessionId, exit) => exits.push(exit.exitCode),
        ptyFactory: new ThrowingPtyFactory()
      })
    });

    runtime.start({
      kind: "agent",
      prompt: "Where is api config model persistence implemented?",
      workspaceRoot
    });

    await waitForExit(exits);
    const requestText = modelClient.requests[0]?.messages.map((message) => message.content).join("\n");

    expect(requestText).toContain("rag.retrieve_context");
    expect(requestText).toContain("apiConfigStore.ts");
    expect(requestText).toContain("modelPersistence");
  });

  it("attaches images to the latest user model message", async () => {
    const workspaceRoot = await createWorkspace();
    const exits: number[] = [];
    const modelClient = new FakeModelClient();
    const runtime = new AgentRuntimeService({
      apiConfig: configuredApi(workspaceRoot),
      files: new FileService({ workspaceRoot }),
      git: new GitService({ workspaceRoot }),
      modelClient,
      search: new SearchService({ workspaceRoot }),
      sessions: new SessionManager({
        onData: () => {},
        onExit: (_sessionId, exit) => exits.push(exit.exitCode),
        ptyFactory: new ThrowingPtyFactory()
      }),
      toolRunner: fakeToolRunner()
    });

    runtime.start({
      attachments: [{ dataUrl: "data:image/png;base64,aGVsbG8=", mimeType: "image/png", name: "demo.png" }],
      kind: "agent",
      prompt: "看图",
      workspaceRoot
    });

    await waitForExit(exits);
    expect(modelClient.requests[0]?.messages.at(-1)).toMatchObject({
      attachments: [{ mimeType: "image/png", name: "demo.png" }],
      content: "看图",
      role: "user"
    });
  });
});

function configuredApi(workspaceRoot: string): ApiConfigService {
  const service = new ApiConfigService({ storePath: join(workspaceRoot, "api-configs.json") });
  service.updateConfig("anthropic-default", { apiKey: "test-key" } as Partial<ApiConfig>);
  return service;
}

function fakeToolRunner(): AgentToolRunner {
  return {
    runStartupTools: async () => [
      {
        name: "workspace.list_root",
        ok: true,
        output: "src/"
      }
    ]
  };
}

async function createWorkspace(): Promise<string> {
  const root = join(tmpdir(), `nexus-runtime-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  return root;
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
