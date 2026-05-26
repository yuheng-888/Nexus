import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { AsarService } from "../src/main/asarService.js";

describe("AsarService", () => {
  it("packs, inspects, extracts, and diffs ASAR archives", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-asar-"));
    const service = new AsarService();
    const firstSource = join(root, "first");
    const secondSource = join(root, "second");
    const firstArchive = join(root, "first.asar");
    const secondArchive = join(root, "second.asar");
    const extractDir = join(root, "extract");

    await writeFixture(firstSource, "console.log('v1');");
    await writeFixture(secondSource, "console.log('v2');");
    await writeFile(join(secondSource, "added.js"), "module.exports = 42;");

    await service.pack({ archivePath: firstArchive, sourceDirectory: firstSource });
    await service.pack({ archivePath: secondArchive, sourceDirectory: secondSource });

    const inspected = await service.inspect({ archivePath: firstArchive });
    expect(inspected.files).toBe(2);
    expect(inspected.entries.map((entry) => entry.path)).toContain("src/main.js");

    await service.extract({ archivePath: firstArchive, destinationPath: extractDir });
    await expect(readFile(join(extractDir, "src", "main.js"), "utf8")).resolves.toContain("v1");

    const diff = await service.diff({ afterPath: secondArchive, beforePath: firstArchive });
    expect(diff.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ change: "modified", path: "src/main.js" }),
      expect.objectContaining({ change: "added", path: "added.js" })
    ]));
  });
});

async function writeFixture(root: string, mainSource: string): Promise<void> {
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ main: "src/main.js" }));
  await writeFile(join(root, "src", "main.js"), mainSource);
}
