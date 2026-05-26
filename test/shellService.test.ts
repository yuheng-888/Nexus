import { describe, expect, it, vi } from "vitest";
import { ShellService } from "../src/main/shellService.js";

describe("ShellService", () => {
  it("reveals absolute paths through the native shell bridge", () => {
    const bridge = { showItemInFolder: vi.fn() };
    const service = new ShellService({ bridge });
    const result = service.revealPath("/tmp/nexus-output/app.asar");

    expect(bridge.showItemInFolder).toHaveBeenCalledWith("/tmp/nexus-output/app.asar");
    expect(result).toEqual({ path: "/tmp/nexus-output/app.asar", success: true });
  });

  it("rejects relative reveal paths explicitly", () => {
    const bridge = { showItemInFolder: vi.fn() };
    const service = new ShellService({ bridge });

    expect(() => service.revealPath("dist/app.asar")).toThrow(/absolute path/);
    expect(bridge.showItemInFolder).not.toHaveBeenCalled();
  });
});
