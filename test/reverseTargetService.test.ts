import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ReverseTargetService } from "../src/main/reverseTargetService.js";

describe("ReverseTargetService", () => {
  it("detects ASAR archives, Electron apps, Node projects, JavaScript bundles, and unknown paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "nexus-reverse-targets-"));
    const service = new ReverseTargetService();
    const asarPath = join(root, "app.asar");
    const electronApp = join(root, "Demo.app");
    const nodeProject = join(root, "node-project");
    const bundlePath = join(root, "renderer.bundle.js");
    const unknownPath = join(root, "notes.txt");

    await writeFile(asarPath, "not a real archive");
    await mkdir(join(electronApp, "Contents", "Resources"), { recursive: true });
    await writeFile(join(electronApp, "Contents", "Resources", "app.asar"), "");
    await mkdir(nodeProject);
    await writeFile(join(nodeProject, "package.json"), JSON.stringify({ main: "main.js" }));
    await writeFile(bundlePath, "(()=>{window.Nexus=true})()");
    await writeFile(unknownPath, "plain text");

    await expect(service.detect(asarPath)).resolves.toMatchObject({ type: "asar" });
    await expect(service.detect(electronApp)).resolves.toMatchObject({ type: "electron-app" });
    await expect(service.detect(nodeProject)).resolves.toMatchObject({ type: "node-project" });
    await expect(service.detect(bundlePath)).resolves.toMatchObject({ type: "javascript-bundle" });
    await expect(service.detect(unknownPath)).resolves.toMatchObject({ type: "unknown" });
  });
});
