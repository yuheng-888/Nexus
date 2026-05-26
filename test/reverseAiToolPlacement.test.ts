import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("reverse AI tool placement", () => {
  it("does not expose a manual reverse workbench in the sidebar or command palette", async () => {
    const sources = await Promise.all([
      readProjectFile("frontend/src/components/sidebar/SidebarNav.tsx"),
      readProjectFile("frontend/src/components/sidebar/SidebarContent.tsx"),
      readProjectFile("frontend/src/components/commandPalette/useNexusCommands.ts"),
      readProjectFile("frontend/src/store/storeTypes.ts")
    ]);
    const joined = sources.join("\n");

    expect(joined).not.toContain("sidebar.reverse");
    expect(joined).not.toContain("逆向工作台");
    expect(joined).not.toContain("ScanSearch");
    expect(joined).not.toContain("\"reverse\"");
  });
});

function readProjectFile(path: string): Promise<string> {
  return readFile(join(process.cwd(), path), "utf8");
}
