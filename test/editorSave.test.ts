import { describe, expect, it, vi } from "vitest";
import { saveEditorTab } from "../frontend/src/components/editor/editorSave.js";
import type { FileReadResult } from "../frontend/src/types/nexus.js";

describe("editor save", () => {
  it("writes the current tab content and marks the tab saved", async () => {
    const write = vi.fn<SaveWrite>().mockResolvedValue(fileResult());
    const markSaved = vi.fn();

    const result = await saveEditorTab({
      content: "export const name = 'Nexus';\n",
      markSaved,
      path: "src/app.ts",
      write,
      writeAbsolute: vi.fn<SaveWrite>()
    });

    expect(write).toHaveBeenCalledWith("src/app.ts", "export const name = 'Nexus';\n");
    expect(markSaved).toHaveBeenCalledWith("src/app.ts", 123);
    expect(result).toEqual(fileResult());
  });

  it("writes absolute tabs through the absolute file API", async () => {
    const write = vi.fn<SaveWrite>();
    const writeAbsolute = vi.fn<SaveWrite>().mockResolvedValue({
      ...fileResult(),
      absolutePath: "/tmp/reverse/main.js",
      path: "/tmp/reverse/main.js"
    });
    const markSaved = vi.fn();

    const result = await saveEditorTab({
      content: "console.log('patched');\n",
      markSaved,
      path: "/tmp/reverse/main.js",
      write,
      writeAbsolute
    });

    expect(write).not.toHaveBeenCalled();
    expect(writeAbsolute).toHaveBeenCalledWith("/tmp/reverse/main.js", "console.log('patched');\n");
    expect(markSaved).toHaveBeenCalledWith("/tmp/reverse/main.js", 123);
    expect(result.path).toBe("/tmp/reverse/main.js");
  });

  it("surfaces write failures without marking the tab saved", async () => {
    const error = new Error("disk full");
    const write = vi.fn<SaveWrite>().mockRejectedValue(error);
    const markSaved = vi.fn();

    await expect(saveEditorTab({
      content: "broken",
      markSaved,
      path: "src/app.ts",
      write,
      writeAbsolute: vi.fn<SaveWrite>()
    })).rejects.toThrow("disk full");
    expect(markSaved).not.toHaveBeenCalled();
  });
});

type SaveWrite = (path: string, content: string) => Promise<FileReadResult>;

function fileResult(): FileReadResult {
  return {
    absolutePath: "/workspace/src/app.ts",
    content: "export const name = 'Nexus';\n",
    mtimeMs: 123,
    path: "src/app.ts"
  };
}
