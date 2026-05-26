import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "../src/contracts.js";
import { ApiConfigService } from "../src/main/apiConfigService.js";
import type { AgentModelClient, AgentModelRequest, AgentModelResponse } from "../src/main/agentModelClient.js";
import { AgentRuntimeService } from "../src/main/agentRuntimeService.js";
import type { AgentToolRunner } from "../src/main/agentTools.js";
import { FileService } from "../src/main/fileService.js";
import { GitService } from "../src/main/gitService.js";
import { SearchService } from "../src/main/searchService.js";
import type { PtyFactory, PtyProcess } from "../src/main/sessionManager.js";
import { SessionManager } from "../src/main/sessionManager.js";

const WAIT_ATTEMPTS = 20;
const WAIT_DELAY_MS = 10;

class FakeModelClient implements AgentModelClient {
  requests: AgentModelRequest[] = [];
  private readonly responses: readonly AgentModelResponse[];

  constructor(responses: readonly AgentModelResponse[]) {
    this.responses = responses;
  }

  async complete(request: AgentModelRequest): Promise<AgentModelResponse> {
    this.requests = [...this.requests, request];
    return this.responses[this.requests.length - 1] ?? this.responses.at(-1) ?? { text: "" };
  }
}

class ThrowingPtyFactory implements PtyFactory {
  spawn(): PtyProcess {
    throw new Error("native agent runtime must not spawn a CLI process");
  }
}

describe("AgentRuntimeService native tool loop", () => {
  it("runs requested native tools and feeds results back to the model", async () => {
    const workspaceRoot = await createWorkspace();
    await mkdir(join(workspaceRoot, "src"), { recursive: true });
    await writeFile(join(workspaceRoot, "src/app.ts"), "export const greeting = 'hello from Nexus';\n");
    const events: string[] = [];
    const exits: number[] = [];
    const modelClient = new FakeModelClient([
      {
        text: JSON.stringify({
          arguments: { path: "src/app.ts" },
          id: "read-app",
          name: "workspace.read_file",
          type: "nexus.tool_call"
        })
      },
      { text: "The file exports a Nexus greeting." }
    ]);

    createRuntime(workspaceRoot, modelClient, events, exits).start({
      kind: "agent",
      prompt: "Read src/app.ts before answering",
      workspaceRoot
    });

    await waitForExit(exits);
    const secondRequest = modelClient.requests[1]?.messages.map((message) => message.content).join("\n");
    const parsedEvents = parseEvents(events);

    expect(exits).toEqual([0]);
    expect(modelClient.requests).toHaveLength(2);
    expect(secondRequest).toContain("workspace.read_file");
    expect(secondRequest).toContain("hello from Nexus");
    expect(parsedEvents).toContainEqual(expect.objectContaining({
      id: "read-app",
      name: "workspace.read_file",
      type: "agent.tool.requested"
    }));
    expect(parsedEvents).toContainEqual(expect.objectContaining({
      id: "read-app",
      name: "workspace.read_file",
      ok: true,
      type: "agent.tool.completed"
    }));
    expect(parsedEvents).toContainEqual({
      message: "The file exports a Nexus greeting.",
      type: "agent.message"
    });
  });

  it("returns unknown native tool failures to the model explicitly", async () => {
    const workspaceRoot = await createWorkspace();
    const events: string[] = [];
    const exits: number[] = [];
    const modelClient = new FakeModelClient([
      {
        text: JSON.stringify({
          arguments: {},
          id: "bad-tool",
          name: "workspace.delete_everything",
          type: "nexus.tool_call"
        })
      },
      { text: "workspace.delete_everything is not available." }
    ]);

    createRuntime(workspaceRoot, modelClient, events, exits).start({
      kind: "subagent",
      prompt: "Try an unsupported tool",
      workspaceRoot
    });

    await waitForExit(exits);
    const secondRequest = modelClient.requests[1]?.messages.map((message) => message.content).join("\n");

    expect(exits).toEqual([0]);
    expect(secondRequest).toContain("Unknown Nexus tool: workspace.delete_everything");
    expect(parseEvents(events)).toContainEqual(expect.objectContaining({
      id: "bad-tool",
      name: "workspace.delete_everything",
      ok: false,
      type: "agent.tool.completed"
    }));
  });

  it("requires approval before running write native tools", async () => {
    const workspaceRoot = await createWorkspace();
    await mkdir(join(workspaceRoot, "src"), { recursive: true });
    await writeFile(join(workspaceRoot, "src/note.txt"), "before\n");
    const events: string[] = [];
    const exits: number[] = [];
    const modelClient = new FakeModelClient([
      {
        text: JSON.stringify({
          arguments: { content: "after\n", path: "src/note.txt" },
          id: "write-note",
          name: "workspace.write_file",
          type: "nexus.tool_call"
        })
      },
      { text: "Updated src/note.txt." }
    ]);
    const manager = new SessionManager({
      onData: (sessionId, data) => {
        events.push(data);
        approveRequestedTool(manager, sessionId, data);
      },
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: new ThrowingPtyFactory()
    });
    const runtime = createRuntimeWithSessions(workspaceRoot, modelClient, manager);

    runtime.start({
      kind: "agent",
      prompt: "Update src/note.txt",
      workspaceRoot
    });

    await waitForExit(exits);
    const secondRequest = modelClient.requests[1]?.messages.map((message) => message.content).join("\n");
    const parsedEvents = parseEvents(events);

    expect(await readFile(join(workspaceRoot, "src/note.txt"), "utf8")).toBe("after\n");
    expect(secondRequest).toContain("workspace.write_file");
    expect(secondRequest).toContain("Wrote src/note.txt");
    expect(parsedEvents).toContainEqual(expect.objectContaining({
      id: "write-note",
      name: "workspace.write_file",
      preview: expect.stringContaining("src/note.txt"),
      type: "agent.tool.approval_requested"
    }));
    expect(parsedEvents).toContainEqual(expect.objectContaining({
      approved: true,
      id: "write-note",
      type: "agent.tool.approval_resolved"
    }));
  });
});

function createRuntime(
  workspaceRoot: string,
  modelClient: AgentModelClient,
  events: string[],
  exits: number[]
): AgentRuntimeService {
  const sessions = new SessionManager({
    onData: (_sessionId, data) => events.push(data),
    onExit: (_sessionId, exit) => exits.push(exit.exitCode),
    ptyFactory: new ThrowingPtyFactory()
  });
  return createRuntimeWithSessions(workspaceRoot, modelClient, sessions);
}

function createRuntimeWithSessions(
  workspaceRoot: string,
  modelClient: AgentModelClient,
  sessions: SessionManager
): AgentRuntimeService {
  return new AgentRuntimeService({
    apiConfig: configuredApi(workspaceRoot),
    files: new FileService({ workspaceRoot }),
    git: new GitService({ workspaceRoot }),
    modelClient,
    search: new SearchService({ workspaceRoot }),
    sessions,
    toolRunner: fakeStartupToolRunner()
  });
}

function configuredApi(workspaceRoot: string): ApiConfigService {
  const service = new ApiConfigService({ storePath: join(workspaceRoot, "api-configs.json") });
  service.updateConfig("anthropic-default", { apiKey: "test-key" } as Partial<ApiConfig>);
  return service;
}

function fakeStartupToolRunner(): AgentToolRunner {
  return {
    runStartupTools: async () => [{ name: "workspace.list_root", ok: true, output: "src/" }]
  };
}

async function createWorkspace(): Promise<string> {
  const root = join(tmpdir(), `nexus-tool-loop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function waitForExit(exits: readonly number[]): Promise<void> {
  for (let attempt = 0; attempt < WAIT_ATTEMPTS; attempt += 1) {
    if (exits.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_DELAY_MS));
  }

  throw new Error("runtime session did not exit");
}

function parseEvents(chunks: readonly string[]): readonly Record<string, unknown>[] {
  return chunks.flatMap((chunk) => {
    return chunk.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
  });
}

function approveRequestedTool(manager: SessionManager, sessionId: string, data: string): void {
  for (const event of parseEvents([data])) {
    if (event.type !== "agent.tool.approval_requested" || typeof event.id !== "string") continue;
    manager.write(sessionId, `${JSON.stringify({
      approved: true,
      id: event.id,
      type: "agent.tool.approval"
    })}\n`);
  }
}
