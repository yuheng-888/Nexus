import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type {
  ReverseAnalysisRequest,
  ReverseAnalysisResult,
  ReverseAsarDiffRequest,
  ReverseAsarDiffResult,
  ReverseAsarExtractRequest,
  ReverseAsarExtractResult,
  ReverseAsarInspectRequest,
  ReverseAsarInspectResult,
  ReverseAsarPackRequest,
  ReverseAsarPackResult,
  ReverseJsHookGenerateRequest,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectRequest,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreRequest,
  ReverseJsHookRestoreResult,
  ReverseProject,
  ReverseProjectDraft,
  ReverseTargetDetection
} from "../src/reverseContracts.js";

describe("NativeAgentInteractiveToolRunner reverse workbench tools", () => {
  it("exposes ASAR and reverse project reads as read-only native tools", async () => {
    const runner = new NativeAgentInteractiveToolRunner({ reverse: new FakeReverseProvider() });
    const context = fakeContext();

    const inspect = await runner.runToolCall(toolCall("reverse.asar.inspect", { archivePath: "/tmp/app.asar" }), context);
    const diff = await runner.runToolCall(toolCall("reverse.asar.diff", { afterPath: "/tmp/after.asar", beforePath: "/tmp/before.asar" }), context);
    const projects = await runner.runToolCall(toolCall("reverse.projects.list", {}), context);

    expect(runner.getToolDefinition("reverse.asar.inspect")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("reverse.asar.diff")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("reverse.projects.list")).toMatchObject({ permission: "read" });
    expect(inspect.output).toContain("/tmp/app.asar");
    expect(inspect.output).toContain("files: 2");
    expect(diff.output).toContain("added: 1");
    expect(projects.output).toContain("demo-electron [electron-app]");
  });

  it("marks ASAR, jshook, and reverse project mutations as approval-gated write tools", async () => {
    const provider = new FakeReverseProvider();
    const runner = new NativeAgentInteractiveToolRunner({ reverse: provider });
    const context = fakeContext();
    const calls = [
      ["reverse.asar.extract", { archivePath: "/tmp/app.asar", destinationPath: "/tmp/app" }, "Extract ASAR /tmp/app.asar -> /tmp/app", "extractedFiles: 2"],
      ["reverse.asar.pack", { archivePath: "/tmp/out.asar", sourceDirectory: "/tmp/app" }, "Pack ASAR /tmp/app -> /tmp/out.asar", "packedFiles: 2"],
      ["reverse.jshook.generate", { outputDirectory: "/tmp/app" }, "Generate jshook in /tmp/app", "hookPath: /tmp/app/nexus-jshook.js"],
      ["reverse.jshook.inject", { targetPath: "/tmp/app", entryPath: "main.js" }, "Inject jshook into /tmp/app", "backupPath: /tmp/app/main.js.bak"],
      ["reverse.jshook.restore", { backupPath: "/tmp/app/main.js.bak", entryPath: "/tmp/app/main.js" }, "Restore jshook backup /tmp/app/main.js.bak", "restored: true"],
      ["reverse.projects.add", { name: "demo-electron", targetPath: "/tmp/app" }, "Add reverse project demo-electron", "project: demo-electron"],
      ["reverse.projects.remove", { id: "reverse-1" }, "Remove reverse project reverse-1", "removed: true"]
    ] as const;

    for (const [name, args, previewText, outputText] of calls) {
      expect(runner.getToolDefinition(name)).toMatchObject({ permission: "write" });
      expect(await runner.previewToolCall(toolCall(name, args), context)).toContain(previewText);
      expect((await runner.runToolCall(toolCall(name, args), context)).output).toContain(outputText);
    }

    expect(provider.calls).toEqual([
      "extractAsar",
      "packAsar",
      "generateJavaScriptHook",
      "injectJavaScriptHook",
      "restoreJavaScriptHook",
      "addProject",
      "removeProject"
    ]);
  });
});

class FakeReverseProvider {
  calls: string[] = [];

  async addProject(draft: ReverseProjectDraft): Promise<ReverseProject> {
    this.calls = [...this.calls, "addProject"];
    return project({ name: draft.name, targetPath: draft.targetPath });
  }

  async detectTarget(path: string): Promise<ReverseTargetDetection> {
    return { absolutePath: path, confidence: 0.9, name: "app", path, signals: ["package.json"], type: "electron-app" };
  }

  async diffAsar(_request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult> {
    return { added: 1, afterPath: "/tmp/after.asar", beforePath: "/tmp/before.asar", entries: [], modified: 2, removed: 3 };
  }

  async extractAsar(request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult> {
    this.calls = [...this.calls, "extractAsar"];
    return { archivePath: request.archivePath, destinationPath: request.destinationPath, extractedFiles: 2 };
  }

  async generateJavaScriptHook(request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult> {
    this.calls = [...this.calls, "generateJavaScriptHook"];
    return { features: ["fetch", "xhr"], hookFilename: "nexus-jshook.js", hookPath: `${request.outputDirectory}/nexus-jshook.js`, sourceLength: 42 };
  }

  async injectJavaScriptHook(request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult> {
    this.calls = [...this.calls, "injectJavaScriptHook"];
    return { backupPath: "/tmp/app/main.js.bak", bootstrapLine: "require('./nexus-jshook.js');", entryPath: request.entryPath ?? "/tmp/app/main.js", hookPath: "/tmp/app/nexus-jshook.js", marker: "Nexus jshook", targetPath: request.targetPath };
  }

  async inspectAsar(request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult> {
    return { archivePath: request.archivePath, directories: 1, entries: [], files: 2, totalSize: 128 };
  }

  async listProjects(): Promise<readonly ReverseProject[]> {
    return [project({ name: "demo-electron", targetPath: "/tmp/app" })];
  }

  async packAsar(request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult> {
    this.calls = [...this.calls, "packAsar"];
    return { archivePath: request.archivePath, packedFiles: 2, sourceDirectory: request.sourceDirectory };
  }

  async removeProject(_id: string): Promise<boolean> {
    this.calls = [...this.calls, "removeProject"];
    return true;
  }

  async restoreJavaScriptHook(request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult> {
    this.calls = [...this.calls, "restoreJavaScriptHook"];
    return { backupPath: request.backupPath, entryPath: request.entryPath, restored: true };
  }

  async scanJavaScript(_request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult> {
    return { dependencies: [], findings: [], scannedFiles: 0, skippedFiles: [], targetPath: "/tmp/app" };
  }
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

function project(input: { readonly name: string; readonly targetPath: string }): ReverseProject {
  return { createdAt: 1, id: "reverse-1", name: input.name, targetPath: input.targetPath, targetType: "electron-app", updatedAt: 2 };
}

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}
