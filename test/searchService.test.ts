import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchService } from "../src/main/searchService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-search-"));
  await mkdir(join(workspaceRoot, "src"));
  await writeFile(join(workspaceRoot, "src/app.ts"), "const product = 'Nexus';\n");
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("SearchService", () => {
  it("returns ripgrep matches as file, line, and preview records", async () => {
    const service = new SearchService({ workspaceRoot });

    const matches = await service.search({ query: "Nexus" });

    expect(matches).toEqual([
      {
        line: 1,
        path: "src/app.ts",
        preview: "const product = 'Nexus';"
      }
    ]);
  });

  it("previews and applies literal replacements across matched files", async () => {
    const service = new SearchService({ workspaceRoot });
    await writeFile(join(workspaceRoot, "src/app.ts"), "const name = 'Nexus';\nconsole.log('Nexus');\n");

    const preview = await service.previewReplace({ query: "Nexus", replacement: "Nexus IDE" });

    expect(preview).toEqual({
      files: [{
        matches: 2,
        path: "src/app.ts",
        previews: [
          { after: "const name = 'Nexus IDE';", before: "const name = 'Nexus';", line: 1 },
          { after: "console.log('Nexus IDE');", before: "console.log('Nexus');", line: 2 }
        ]
      }],
      totalMatches: 2
    });

    const applied = await service.applyReplace({ query: "Nexus", replacement: "Nexus IDE" });

    expect(applied).toEqual({
      filesChanged: 1,
      paths: ["src/app.ts"],
      totalMatches: 2
    });
    await expect(readFile(join(workspaceRoot, "src/app.ts"), "utf8")).resolves.toBe(
      "const name = 'Nexus IDE';\nconsole.log('Nexus IDE');\n"
    );
  });
});
