import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ReverseProjectService } from "../src/main/reverseProjectService.js";

describe("ReverseProjectService", () => {
  it("persists reverse projects across service instances", async () => {
    const storePath = await createStorePath();
    const service = new ReverseProjectService({ storePath });
    const project = await service.addProject({
      draft: { name: "Demo app", notes: "inspect IPC", targetPath: "/tmp/demo.app" },
      targetType: "electron-app"
    });

    const reloaded = new ReverseProjectService({ storePath });

    await expect(reloaded.listProjects()).resolves.toEqual([project]);
  });

  it("throws explicit errors for malformed project stores", async () => {
    const storePath = await createStorePath();
    await writeFile(storePath, "{not json", "utf8");

    const service = new ReverseProjectService({ storePath });

    await expect(service.listProjects()).rejects.toThrow("Reverse project store is not valid JSON");
  });
});

async function createStorePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "nexus-reverse-projects-"));
  return join(directory, "reverse-projects.json");
}
