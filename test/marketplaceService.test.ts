import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { MarketplaceService } from "../src/main/marketplaceService.js";

const execFileAsync = promisify(execFile);

let skillsDir = "";
let pluginsDir = "";
let tempRoots: string[] = [];

afterEach(async () => {
  if (skillsDir !== "") {
    await rm(skillsDir, { force: true, recursive: true });
    skillsDir = "";
  }

  if (pluginsDir !== "") {
    await rm(pluginsDir, { force: true, recursive: true });
    pluginsDir = "";
  }

  await Promise.all(tempRoots.map((root) => rm(root, { force: true, recursive: true })));
  tempRoots = [];
});

describe("MarketplaceService", () => {
  it("loads plugins from the VS Code Marketplace", async () => {
    const service = new MarketplaceService({ fetch: marketplaceFetch, pluginsDir: "/tmp/nexus-extensions" });

    const plugins = await service.getPlugins({ query: "python" });

    expect(plugins[0]).toMatchObject({
      author: "Microsoft",
      extensionName: "python",
      id: "vscode:ms-python.python",
      name: "Python",
      publisher: "ms-python",
      source: "vscode",
      version: "2026.5.1"
    });
    expect(plugins[0]?.downloads).toBe(1234567);
    expect(plugins[0]?.rating).toBe(4.8);
    expect(plugins[0]?.vsixUrl).toContain("Microsoft.VisualStudio.Services.VSIXPackage");
  });

  it("downloads VS Code extensions as VSIX packages when installing plugins", async () => {
    pluginsDir = await mkdtemp(join(tmpdir(), "nexus-extensions-"));
    const service = new MarketplaceService({ fetch: marketplaceFetch, pluginsDir, skillsDir: "/tmp/skills" });
    await service.getPlugins({ query: "python" });

    const result = await service.installPlugin("vscode:ms-python.python");
    const installed = await readFile(join(pluginsDir, "ms-python.python", "2026.5.1.vsix"));
    const manifest = await readFile(join(pluginsDir, "ms-python.python", "extension", "package.json"), "utf8");

    expect(result).toMatchObject({
      installedPath: join(pluginsDir, "ms-python.python", "2026.5.1.vsix"),
      success: true
    });
    expect(installed.length).toBeGreaterThan(0);
    expect(manifest).toContain("Python: Select Interpreter");
  });

  it("persists installed VS Code extensions across service instances", async () => {
    pluginsDir = await mkdtemp(join(tmpdir(), "nexus-extensions-"));
    const service = new MarketplaceService({ fetch: marketplaceFetch, pluginsDir, skillsDir: "/tmp/skills" });
    await service.getPlugins({ query: "python" });
    await service.installPlugin("vscode:ms-python.python");

    const restoredService = new MarketplaceService({ fetch: emptyMarketplaceFetch, pluginsDir, skillsDir: "/tmp/skills" });
    const plugins = await restoredService.getPlugins({ query: "go" });

    expect(plugins[0]).toMatchObject({
      contributions: {
        configurationKeys: ["python.analysis.typeCheckingMode"],
        grammars: ["source.python"],
        snippets: ["python"]
      },
      enabled: true,
      id: "vscode:ms-python.python",
      installed: true,
      installedPath: join(pluginsDir, "ms-python.python", "2026.5.1.vsix")
    });
  });

  it("removes local VSIX packages and persisted state when uninstalling plugins", async () => {
    pluginsDir = await mkdtemp(join(tmpdir(), "nexus-extensions-"));
    const service = new MarketplaceService({ fetch: marketplaceFetch, pluginsDir, skillsDir: "/tmp/skills" });
    await service.getPlugins({ query: "python" });
    const install = await service.installPlugin("vscode:ms-python.python");
    const manifestPath = join(pluginsDir, "ms-python.python", "extension", "package.json");

    const uninstall = await service.uninstallPlugin("vscode:ms-python.python");
    const restoredService = new MarketplaceService({ fetch: marketplaceFetch, pluginsDir, skillsDir: "/tmp/skills" });
    const plugins = await restoredService.getPlugins({ query: "python" });

    await expect(readFile(install.installedPath ?? "", "utf8")).rejects.toThrow(/ENOENT/);
    await expect(readFile(manifestPath, "utf8")).rejects.toThrow(/ENOENT/);
    expect(uninstall.success).toBe(true);
    expect(plugins[0]).toMatchObject({ enabled: false, installed: false });
  });

  it("loads SkillsMP skills from keyword search", async () => {
    const service = new MarketplaceService({ fetch: searchFetch, skillsDir: "/tmp/skills" });

    const skills = await service.getSkills({ query: "codex" });

    expect(skills[0]).toMatchObject({
      author: "tomevault-io",
      githubUrl: "https://github.com/tomevault-io/skills-registry/tree/main/demo--skill",
      id: "skillsmp-demo",
      name: "codex-demo",
      source: "skillsmp"
    });
  });

  it("installs a SkillsMP skill into the configured skills directory", async () => {
    skillsDir = await mkdtemp(join(tmpdir(), "nexus-skills-"));
    const service = new MarketplaceService({ fetch: installFetch, skillsDir });
    await service.getSkills({ query: "codex" });

    const result = await service.installSkill("skillsmp-demo");
    const installed = await readFile(join(skillsDir, "codex-demo", "SKILL.md"), "utf8");

    expect(result.success).toBe(true);
    expect(result.message).toContain("codex-demo");
    expect(installed).toContain("name: codex-demo");
  });

});

async function searchFetch(): Promise<Response> {
  return new Response(JSON.stringify({
    data: {
      skills: [{
        author: "tomevault-io",
        description: "Demo Codex skill",
        githubUrl: "https://github.com/tomevault-io/skills-registry/tree/main/demo--skill",
        id: "skillsmp-demo",
        name: "codex-demo",
        skillUrl: "https://skillsmp.com/skills/skillsmp-demo",
        stars: 3,
        updatedAt: "1779575404"
      }]
    },
    success: true
  }));
}

async function marketplaceFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const textUrl = String(url);

  if (textUrl.includes("extensionquery")) {
    expect(init?.method).toBe("POST");
    return new Response(JSON.stringify({
      results: [{
        extensions: [{
          displayName: "Python",
          extensionName: "python",
          lastUpdated: "2026-05-25T11:42:33.927+00:00",
          publisher: {
            displayName: "Microsoft",
            publisherName: "ms-python"
          },
          shortDescription: "Python language support",
          statistics: [
            { statisticName: "install", value: 1234567 },
            { statisticName: "averagerating", value: 4.8 }
          ],
          versions: [{
            files: [{
              assetType: "Microsoft.VisualStudio.Services.VSIXPackage",
              source: "https://example.com/Microsoft.VisualStudio.Services.VSIXPackage"
            }],
            version: "2026.5.1"
          }]
        }]
      }]
    }));
  }

  if (textUrl.includes("VSIXPackage")) {
    return new Response(new Uint8Array(await createVsixPackage()));
  }

  throw new Error(`Unexpected fetch URL: ${textUrl}`);
}

async function emptyMarketplaceFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const textUrl = String(url);

  if (textUrl.includes("extensionquery")) {
    expect(init?.method).toBe("POST");
    return new Response(JSON.stringify({ results: [{ extensions: [] }] }));
  }

  throw new Error(`Unexpected fetch URL: ${textUrl}`);
}

async function createVsixPackage(): Promise<Buffer> {
  const root = await temporaryRoot("nexus-vsix-");
  const extensionRoot = join(root, "extension");
  const vsixPath = join(root, "plugin.vsix");

  await mkdir(extensionRoot, { recursive: true });
  await writeFile(join(extensionRoot, "package.json"), JSON.stringify(vsixManifest()));
  await execFileAsync("ditto", ["-c", "-k", "--keepParent", "extension", vsixPath], { cwd: root });
  return readFile(vsixPath);
}

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function vsixManifest(): Record<string, unknown> {
  return {
    activationEvents: ["onLanguage:python"],
    contributes: {
      commands: [{ command: "python.setInterpreter", title: "Python: Select Interpreter" }],
      configuration: {
        properties: {
          "python.analysis.typeCheckingMode": {
            default: "basic",
            type: "string"
          }
        },
        title: "Python"
      },
      grammars: [{ language: "python", scopeName: "source.python" }],
      keybindings: [{ command: "python.setInterpreter", key: "cmd+shift+p" }],
      languages: [{ id: "python" }],
      menus: {
        commandPalette: [{ command: "python.setInterpreter" }]
      },
      snippets: [{ language: "python", path: "./snippets/python.json" }],
      themes: [{ label: "Nexus Dark", path: "./themes/nexus-dark.json" }]
    },
    name: "python",
    publisher: "ms-python",
    version: "2026.5.1"
  };
}

async function installFetch(url: string | URL | Request): Promise<Response> {
  const textUrl = String(url);
  if (textUrl.includes("api/v1/skills/search")) {
    return searchFetch();
  }

  if (textUrl.includes("api.github.com/repos")) {
    return new Response(JSON.stringify([{
      download_url: "https://raw.githubusercontent.com/tomevault-io/skills-registry/main/demo--skill/SKILL.md",
      name: "SKILL.md",
      path: "demo--skill/SKILL.md",
      type: "file"
    }]));
  }

  return new Response("---\nname: codex-demo\ndescription: Demo\n---\n");
}
