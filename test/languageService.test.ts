import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageService } from "../src/main/languageService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-languages-"));
  await mkdir(join(workspaceRoot, "src"), { recursive: true });
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("LanguageService", () => {
  it("returns diagnostics for TypeScript documents", async () => {
    const service = new LanguageService({ workspaceRoot });
    await service.openDocument({
      content: "const answer: number = 'wrong';\n",
      languageId: "typescript",
      path: "src/index.ts"
    });

    const diagnostics = await service.diagnostics({ path: "src/index.ts" });

    expect(diagnostics.some((item) => item.message.includes("not assignable"))).toBe(true);
    expect(diagnostics[0]?.range.start.line).toBe(1);
  });

  it("returns completions, hover, definitions, references, and symbols", async () => {
    await writeFile(join(workspaceRoot, "src", "util.ts"), "export const meaning = 42;\n");
    const service = new LanguageService({ workspaceRoot });
    await service.openDocument({
      content: "import { meaning } from './util';\nconst result = mea",
      languageId: "typescript",
      path: "src/index.ts"
    });

    const completions = await service.completions({
      path: "src/index.ts",
      position: { character: 18, line: 2 }
    });
    const definition = await service.definition({
      path: "src/index.ts",
      position: { character: 11, line: 1 }
    });
    const hover = await service.hover({
      path: "src/index.ts",
      position: { character: 11, line: 1 }
    });
    const references = await service.references({
      path: "src/index.ts",
      position: { character: 11, line: 1 }
    });
    const symbols = await service.documentSymbols({ path: "src/index.ts" });

    expect(completions.items.map((item) => item.label)).toContain("meaning");
    expect(definition[0]).toMatchObject({ path: "src/util.ts", range: { start: { line: 1 } } });
    expect(hover.contents).toContain("const meaning");
    expect(references.some((item) => item.path === "src/util.ts")).toBe(true);
    expect(symbols.map((item) => item.name)).toContain("result");
  });

  it("requires a workspace before serving language features", async () => {
    const service = new LanguageService({ workspaceRoot: null });

    await expect(service.diagnostics({ path: "src/index.ts" })).rejects.toThrow(/No workspace is open/);
  });
});
