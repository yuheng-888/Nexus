import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileService } from "../src/main/fileService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-files-"));
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("FileService", () => {
  it("writes, reads, and lists files under the workspace", async () => {
    const service = new FileService({ workspaceRoot });

    await service.writeTextFile("src/app.ts", "export const name = 'Nexus';\n");
    const file = await service.readTextFile("src/app.ts");
    const entries = await service.listDirectory("src");

    expect(file.content).toBe("export const name = 'Nexus';\n");
    expect(entries).toEqual([
      {
        absolutePath: join(workspaceRoot, "src/app.ts"),
        isDirectory: false,
        name: "app.ts",
        path: "src/app.ts"
      }
    ]);
  });

  it("finds files by path for quick open", async () => {
    const service = new FileService({ workspaceRoot });

    await service.writeTextFile("src/app.ts", "export const app = true;\n");
    await service.writeTextFile("src/components/Button.tsx", "export function Button() {}\n");
    await service.writeTextFile("README.md", "# Nexus\n");

    const matches = await service.findFiles("app");

    expect(matches).toEqual([
      {
        absolutePath: join(workspaceRoot, "src/app.ts"),
        isDirectory: false,
        name: "app.ts",
        path: "src/app.ts"
      }
    ]);
  });

  it("skips generated and dependency directories during quick open search", async () => {
    const service = new FileService({ workspaceRoot });

    await service.writeTextFile("node_modules/pkg/app.ts", "export const dependency = true;\n");
    await service.writeTextFile("dist/app.js", "export const generated = true;\n");

    await expect(service.findFiles("app")).resolves.toEqual([]);
  });

  it("rejects writes outside the workspace", async () => {
    const service = new FileService({ workspaceRoot });

    await expect(service.writeTextFile("../escape.txt", "nope")).rejects.toThrow(
      /outside workspace/
    );
  });

  it("reads an absolute text file for local tools outside the workspace", async () => {
    const service = new FileService({ workspaceRoot: null });
    const absolutePath = join(workspaceRoot, "external.js");

    await writeFile(absolutePath, "console.log('absolute');\n");

    await expect(service.readAbsoluteTextFile(absolutePath)).resolves.toMatchObject({
      absolutePath,
      content: "console.log('absolute');\n",
      path: absolutePath
    });
    await expect(service.readAbsoluteTextFile("relative.js")).rejects.toThrow(/absolute path/);
  });

  it("writes an absolute text file for local tools outside the workspace", async () => {
    const service = new FileService({ workspaceRoot: null });
    const absolutePath = join(workspaceRoot, "external-write.js");

    await expect(service.writeAbsoluteTextFile(absolutePath, "export const saved = true;\n")).resolves.toMatchObject({
      absolutePath,
      content: "export const saved = true;\n",
      path: absolutePath
    });
    await expect(service.writeAbsoluteTextFile("relative.js", "nope")).rejects.toThrow(/absolute path/);
  });

  it("rejects file operations before a workspace is open", async () => {
    const service = new FileService({ workspaceRoot: null });

    await expect(service.listDirectory()).rejects.toThrow(/No workspace is open/);
  });
});
