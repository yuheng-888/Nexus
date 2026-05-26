import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NativeAgentLanguageToolProvider } from "../src/main/agentLanguageTools.js";
import { LanguageService } from "../src/main/languageService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-agent-languages-"));
  await mkdir(join(workspaceRoot, "src"), { recursive: true });
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("NativeAgentLanguageToolProvider", () => {
  it("formats diagnostics, symbols, definitions, references, and hover output", async () => {
    await writeFile(join(workspaceRoot, "src", "util.ts"), "export const meaning = 42;\n");
    const service = new LanguageService({ workspaceRoot });
    const provider = new NativeAgentLanguageToolProvider({ service });
    await service.openDocument({
      content: "import { meaning } from './util';\nconst result: number = 'bad';\nconst copy = meaning;\n",
      languageId: "typescript",
      path: "src/index.ts"
    });

    const diagnostics = await provider.diagnostics({ path: "src/index.ts" });
    const symbols = await provider.documentSymbols({ path: "src/index.ts" });
    const definition = await provider.definition({ character: 11, line: 1, path: "src/index.ts" });
    const references = await provider.references({ character: 11, line: 1, path: "src/index.ts" });
    const hover = await provider.hover({ character: 11, line: 1, path: "src/index.ts" });

    expect(diagnostics).toContain("src/index.ts:2:");
    expect(diagnostics).toContain("not assignable");
    expect(symbols).toContain("result");
    expect(definition).toContain("src/util.ts:1:");
    expect(references).toContain("src/index.ts:3:");
    expect(hover).toContain("const meaning");
  });
});
