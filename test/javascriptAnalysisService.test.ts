import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { JavaScriptAnalysisService } from "../src/main/javascriptAnalysisService.js";

describe("JavaScriptAnalysisService", () => {
  it("finds IPC, network, storage, dynamic execution, child process, and dependencies", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-js-analysis-"));
    const service = new JavaScriptAnalysisService();
    const sourcePath = join(root, "main.js");

    await mkdir(root, { recursive: true });
    await writeFile(sourcePath, [
      "const { ipcMain } = require('electron');",
      "const childProcess = require('child_process');",
      "import axios from 'axios';",
      "ipcMain.handle('auth:token', async () => fetch('https://api.example.test/session'));",
      "localStorage.setItem('token', token);",
      "eval(userInput);",
      "childProcess.exec('whoami');"
    ].join("\n"));

    const result = await service.scan({ path: sourcePath });
    const types = result.findings.map((finding) => finding.type);

    expect(types).toContain("electron-ipc");
    expect(types).toContain("network");
    expect(types).toContain("storage");
    expect(types).toContain("dynamic-execution");
    expect(types).toContain("child-process");
    expect(result.findings[0]?.absolutePath).toBe(sourcePath);
    expect(result.dependencies[0]?.absolutePath).toBe(sourcePath);
    expect(result.dependencies.map((dependency) => dependency.name)).toEqual(expect.arrayContaining([
      "electron",
      "child_process",
      "axios"
    ]));
  });
});
