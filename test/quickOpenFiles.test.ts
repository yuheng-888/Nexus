import { describe, expect, it, vi } from "vitest";
import { openQuickOpenFile } from "../frontend/src/components/editor/quickOpenFiles.js";
import type { DirectoryEntry, FileReadResult } from "../frontend/src/types/nexus.js";

describe("quick open files", () => {
  it("reads the selected entry and opens it in the editor", async () => {
    const read = vi.fn<ReadFile>().mockResolvedValue(fileResult());
    const openFile = vi.fn();

    const result = await openQuickOpenFile({ entry: fileEntry(), openFile, read });

    expect(read).toHaveBeenCalledWith("src/app.ts");
    expect(openFile).toHaveBeenCalledWith(fileEntry(), fileResult().content, fileResult().mtimeMs);
    expect(result).toEqual(fileResult());
  });

  it("surfaces read failures without opening an editor tab", async () => {
    const error = new Error("permission denied");
    const read = vi.fn<ReadFile>().mockRejectedValue(error);
    const openFile = vi.fn();

    await expect(openQuickOpenFile({ entry: fileEntry(), openFile, read })).rejects.toThrow(
      "permission denied"
    );
    expect(openFile).not.toHaveBeenCalled();
  });
});

type ReadFile = (path: string) => Promise<FileReadResult>;

function fileEntry(): DirectoryEntry {
  return {
    absolutePath: "/workspace/src/app.ts",
    isDirectory: false,
    name: "app.ts",
    path: "src/app.ts"
  };
}

function fileResult(): FileReadResult {
  return {
    absolutePath: "/workspace/src/app.ts",
    content: "export const app = true;\n",
    mtimeMs: 456,
    path: "src/app.ts"
  };
}
