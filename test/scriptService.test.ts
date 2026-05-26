import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScriptService, type ScriptProcessRunner } from "../src/main/scriptService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-scripts-"));
  await mkdir(join(workspaceRoot, "src"), { recursive: true });
  await writeFile(join(workspaceRoot, "package.json"), JSON.stringify({
    scripts: {
      build: "tsc -p tsconfig.json",
      dev: "vite",
      test: "vitest run"
    }
  }));
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("ScriptService", () => {
  it("discovers package scripts in a workspace", async () => {
    const service = new ScriptService({ workspaceRoot });

    await expect(service.discover()).resolves.toEqual({
      packageManager: "npm",
      scripts: [
        { command: "tsc -p tsconfig.json", name: "build" },
        { command: "vite", name: "dev" },
        { command: "vitest run", name: "test" }
      ]
    });
  });

  it("runs a selected script through npm run", async () => {
    const calls: ProcessCall[] = [];
    const service = new ScriptService({ runner: recordingRunner(calls), workspaceRoot });

    const result = await service.run({ name: "build" });

    expect(calls).toEqual([{ args: ["run", "build"], command: "npm", cwd: workspaceRoot }]);
    expect(result).toMatchObject({
      command: "npm run build",
      exitCode: 0,
      passed: true,
      script: { command: "tsc -p tsconfig.json", name: "build" },
      stdout: "built"
    });
  });
});

interface ProcessCall {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}

function recordingRunner(calls: ProcessCall[]): ScriptProcessRunner {
  return async (request) => {
    calls.push(request);
    return { exitCode: 0, stderr: "", stdout: "built" };
  };
}
