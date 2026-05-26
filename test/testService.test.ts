import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestService, type TestProcessRunner } from "../src/main/testService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-tests-"));
  await mkdir(join(workspaceRoot, "src"), { recursive: true });
  await writeFile(join(workspaceRoot, "package.json"), JSON.stringify({
    scripts: { test: "vitest run" }
  }));
  await writeFile(join(workspaceRoot, "src/app.test.ts"), "import { it } from 'vitest';\n");
  await writeFile(join(workspaceRoot, "src/helper.spec.ts"), "import { it } from 'vitest';\n");
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("TestService", () => {
  it("discovers npm test scripts and workspace test files", async () => {
    const service = new TestService({ workspaceRoot });

    await expect(service.discover()).resolves.toEqual({
      command: "npm test",
      files: [
        { framework: "vitest", name: "app.test.ts", path: "src/app.test.ts" },
        { framework: "vitest", name: "helper.spec.ts", path: "src/helper.spec.ts" }
      ],
      runner: "npm"
    });
  });

  it("runs all tests or a selected test file through the project test script", async () => {
    const calls: ProcessCall[] = [];
    const service = new TestService({ runner: recordingRunner(calls), workspaceRoot });

    const all = await service.run({ scope: "all" });
    const file = await service.run({ path: "src/app.test.ts", scope: "file" });

    expect(calls).toEqual([
      { args: ["test"], command: "npm", cwd: workspaceRoot },
      { args: ["test", "--", "src/app.test.ts"], command: "npm", cwd: workspaceRoot }
    ]);
    expect(all).toMatchObject({ command: "npm test", exitCode: 0, passed: true });
    expect(file).toMatchObject({ command: "npm test -- src/app.test.ts", exitCode: 0, passed: true });
  });
});

interface ProcessCall {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}

function recordingRunner(calls: ProcessCall[]): TestProcessRunner {
  return async (request) => {
    calls.push(request);
    return { exitCode: 0, stderr: "", stdout: "2 passed" };
  };
}
