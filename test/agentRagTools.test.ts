import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { RagContextBundle, RagIndexStatus, RagIndexSummary, RagSearchRequest, RagSearchResult } from "../src/ragContracts.js";

class FakeRagProvider {
  buildCalls = 0;
  clearCalls = 0;
  contextRequests: RagSearchRequest[] = [];
  searchRequests: RagSearchRequest[] = [];

  async buildIndex(): Promise<RagIndexSummary> {
    this.buildCalls += 1;
    return {
      builtAt: 1779575404000,
      indexed: true,
      indexedChunks: 7,
      indexedFiles: 3,
      indexPath: "/tmp/index.json",
      skippedFiles: [{ message: "large file", path: "dist/app.js" }],
      workspaceRoot: "/workspace"
    };
  }

  async clear(): Promise<RagIndexStatus> {
    this.clearCalls += 1;
    return { indexed: false, indexedChunks: 0, indexedFiles: 0, indexPath: "/tmp/index.json", workspaceRoot: "/workspace" };
  }

  async context(request: RagSearchRequest): Promise<RagContextBundle> {
    this.contextRequests = [...this.contextRequests, request];
    return { generatedAt: 1779575404000, query: request.query, results: [result()] };
  }

  async search(request: RagSearchRequest): Promise<readonly RagSearchResult[]> {
    this.searchRequests = [...this.searchRequests, request];
    return [result()];
  }

  async status(): Promise<RagIndexStatus> {
    return { builtAt: 1779575404000, indexed: true, indexedChunks: 7, indexedFiles: 3, indexPath: "/tmp/index.json", workspaceRoot: "/workspace" };
  }
}

describe("NativeAgentInteractiveToolRunner RAG tools", () => {
  it("exposes index status, search, and context retrieval as read-only tools", async () => {
    const provider = new FakeRagProvider();
    const runner = new NativeAgentInteractiveToolRunner({ rag: provider });

    const status = await runner.runToolCall(toolCall("rag.index_status", {}), fakeContext());
    const search = await runner.runToolCall(toolCall("rag.search", { limit: 4, query: "model config" }), fakeContext());
    const context = await runner.runToolCall(toolCall("rag.retrieve_context", { query: "model config" }), fakeContext());

    expect(runner.getToolDefinition("rag.index_status")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("rag.search")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("rag.retrieve_context")).toMatchObject({ permission: "read" });
    expect(status.output).toContain("indexed: true");
    expect(search.output).toContain("src/apiConfig.ts:2-8 score=0.42");
    expect(context.output).toContain("export const modelConfig = true;");
    expect(provider.searchRequests).toEqual([{ limit: 4, query: "model config" }]);
    expect(provider.contextRequests).toEqual([{ limit: 6, query: "model config" }]);
  });

  it("marks index build and clear as approval-gated write tools", async () => {
    const provider = new FakeRagProvider();
    const runner = new NativeAgentInteractiveToolRunner({ rag: provider });
    const build = toolCall("rag.build_index", {});
    const clear = toolCall("rag.clear_index", {});

    expect(await runner.previewToolCall(build, fakeContext())).toBe("Build local RAG code index");
    expect(await runner.previewToolCall(clear, fakeContext())).toBe("Clear local RAG code index");
    expect((await runner.runToolCall(build, fakeContext())).output).toContain("indexedFiles: 3");
    expect((await runner.runToolCall(clear, fakeContext())).output).toContain("indexed: false");
    expect(runner.getToolDefinition("rag.build_index")).toMatchObject({ permission: "write" });
    expect(runner.getToolDefinition("rag.clear_index")).toMatchObject({ permission: "write" });
    expect(provider.buildCalls).toBe(1);
    expect(provider.clearCalls).toBe(1);
  });
});

function fakeContext(): AgentInteractiveToolContext {
  return {
    cwd: ".",
    files: {} as AgentInteractiveToolContext["files"],
    git: {} as AgentInteractiveToolContext["git"],
    prompt: "fallback prompt",
    search: {} as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}

function result(): RagSearchResult {
  return {
    content: "export const modelConfig = true;",
    endLine: 8,
    path: "src/apiConfig.ts",
    preview: "modelConfig",
    score: 0.42,
    startLine: 2,
    symbols: ["modelConfig"]
  };
}

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}
