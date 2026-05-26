import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { JavaScriptHookService } from "../src/main/javascriptHookService.js";

describe("JavaScriptHookService", () => {
  it("generates a standalone Nexus jshook script", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-jshook-generate-"));
    const service = new JavaScriptHookService();

    const result = await service.generate({ outputDirectory: root });
    const source = await readFile(result.hookPath, "utf8");

    expect(result.hookPath).toBe(join(root, "nexus-jshook.js"));
    expect(source).toContain("__NEXUS_JSHOOK_INSTALLED__");
    expect(source).toContain("Nexus jshook");
    expect(source).toContain("fetch");
    expect(source).toContain("ipcRenderer");
  });

  it("injects the jshook bootstrap into a JavaScript entry file and creates a backup", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-jshook-inject-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ main: "src/main.js" }));
    await writeFile(join(root, "src", "main.js"), "console.log('target');\n");
    const service = new JavaScriptHookService({ now: () => 12345 });

    const result = await service.inject({ targetPath: root });
    const entrySource = await readFile(result.entryPath, "utf8");
    const backupSource = await readFile(result.backupPath, "utf8");

    expect(result.bootstrapLine).toBe("require('../nexus-jshook.js');");
    expect(entrySource).toContain("Nexus jshook: begin");
    expect(entrySource).toContain("require('../nexus-jshook.js');");
    expect(backupSource).toBe("console.log('target');\n");
  });

  it("restores an injected entry file from an explicit backup", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-jshook-restore-"));
    const entryPath = join(root, "main.js");
    const backupPath = join(root, "main.js.nexus-bak-12345");
    await writeFile(entryPath, "require('./nexus-jshook.js');\nconsole.log('patched');\n");
    await writeFile(backupPath, "console.log('original');\n");
    const service = new JavaScriptHookService();

    const result = await service.restore({ backupPath, entryPath });

    await expect(readFile(entryPath, "utf8")).resolves.toBe("console.log('original');\n");
    expect(result.restored).toBe(true);
  });
});
