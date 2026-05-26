import { describe, expect, it } from "vitest";
import { resolveWorkspacePath } from "../src/main/pathGuards.js";

describe("resolveWorkspacePath", () => {
  it("keeps relative paths inside the workspace", () => {
    const resolved = resolveWorkspacePath("/tmp/nexus-root", "src/index.ts");

    expect(resolved).toBe("/tmp/nexus-root/src/index.ts");
  });

  it("rejects traversal outside the workspace", () => {
    expect(() => resolveWorkspacePath("/tmp/nexus-root", "../secret.txt")).toThrow(
      /outside workspace/
    );
  });

  it("allows workspace entries whose names start with two dots", () => {
    const resolved = resolveWorkspacePath("/tmp/nexus-root", "..cache/file.txt");

    expect(resolved).toBe("/tmp/nexus-root/..cache/file.txt");
  });
});
