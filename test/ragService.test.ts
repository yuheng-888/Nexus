import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RagService } from "../src/main/ragService.js";

let workspaceRoot = "";
let indexRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-rag-workspace-"));
  indexRoot = await mkdtemp(join(tmpdir(), "nexus-rag-index-"));
  await mkdir(join(workspaceRoot, "src", "main"), { recursive: true });
  await mkdir(join(workspaceRoot, "node_modules", "pkg"), { recursive: true });
  await writeFile(join(workspaceRoot, "src", "main", "apiConfigStore.ts"), [
    "export class ApiConfigStore {",
    "  saveModelConfig() {",
    "    return 'persist api model config';",
    "  }",
    "}"
  ].join("\n"));
  await writeFile(join(workspaceRoot, "src", "voiceWake.ts"), "export const wakeWord = '天枢';\n");
  await writeFile(join(workspaceRoot, "node_modules", "pkg", "ignored.ts"), "persist ignored");
});

afterEach(async () => {
  await Promise.all([
    rm(workspaceRoot, { force: true, recursive: true }),
    rm(indexRoot, { force: true, recursive: true })
  ]);
});

describe("RagService", () => {
  it("builds, persists, searches, and clears a workspace index", async () => {
    const service = new RagService({ indexRoot, workspaceRoot });

    const summary = await service.buildIndex();
    const results = await service.search({ query: "where model config persist", limit: 3 });
    const restored = new RagService({ indexRoot, workspaceRoot });
    const bundle = await restored.context({ query: "api config store", limit: 2 });

    expect(summary.indexedFiles).toBe(2);
    expect(summary.skippedFiles.some((file) => file.path.includes("node_modules"))).toBe(false);
    expect(results[0]).toMatchObject({
      path: "src/main/apiConfigStore.ts",
      startLine: 1
    });
    expect(bundle.results[0]?.content).toContain("ApiConfigStore");
    await expect(restored.status()).resolves.toMatchObject({ indexed: true, indexedFiles: 2 });
    await expect(restored.clear()).resolves.toMatchObject({ indexed: false });
  });

  it("throws explicit errors when searching before an index exists", async () => {
    const service = new RagService({ indexRoot, workspaceRoot });

    await expect(service.search({ query: "anything" })).rejects.toThrow(/Code index is missing/);
  });
});
