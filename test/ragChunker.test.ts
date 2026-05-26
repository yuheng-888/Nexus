import { describe, expect, it } from "vitest";
import { chunkTextFile } from "../src/main/ragChunker.js";

describe("chunkTextFile", () => {
  it("keeps line ranges and extracts symbol hints", () => {
    const chunks = chunkTextFile({
      content: [
        "import { readFile } from 'node:fs/promises';",
        "",
        "export class ApiConfigStore {",
        "  load() {",
        "    return readFile('x');",
        "  }",
        "}",
        "",
        "function parseState() {",
        "  return {};",
        "}"
      ].join("\n"),
      maxLines: 20,
      path: "src/main/apiConfigStore.ts"
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      endLine: 11,
      path: "src/main/apiConfigStore.ts",
      startLine: 1
    });
    expect(chunks[0]?.symbols).toEqual(expect.arrayContaining(["ApiConfigStore", "parseState"]));
  });

  it("splits long files into stable line-bounded chunks", () => {
    const content = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join("\n");
    const chunks = chunkTextFile({ content, maxLines: 5, path: "src/long.ts" });

    expect(chunks.map((chunk) => [chunk.startLine, chunk.endLine])).toEqual([
      [1, 5],
      [6, 10],
      [11, 12]
    ]);
  });
});
