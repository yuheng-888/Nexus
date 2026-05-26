import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
});
