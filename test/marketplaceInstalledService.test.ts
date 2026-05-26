import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Plugin, Skill } from "../src/contracts.js";
import { MarketplaceService } from "../src/main/marketplaceService.js";

let tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { force: true, recursive: true })));
  tempRoots = [];
});

describe("MarketplaceService installed inventory", () => {
  it("lists locally installed VS Code extensions without querying the marketplace", async () => {
    const service = new MarketplaceService({
      fetch: failFetch,
      pluginStore: pluginStore([installedPlugin()])
    });

    const plugins = await service.getInstalledPlugins();

    expect(plugins).toEqual([
      expect.objectContaining({
        id: "vscode:ms-python.python",
        installed: true,
        name: "Python"
      })
    ]);
  });

  it("lists locally installed SkillsMP skills without querying SkillsMP", async () => {
    const skillsDir = await tempDirectory("nexus-skills-");
    const installedPath = join(skillsDir, "codex-demo");
    const service = new MarketplaceService({
      fetch: failFetch,
      skillStore: skillStore([installedSkill(installedPath)])
    });

    const skills = await service.getInstalledSkills();

    expect(skills).toEqual([
      expect.objectContaining({
        enabled: true,
        installed: true,
        installedPath,
        name: "codex-demo",
        source: "skillsmp"
      })
    ]);
  });
});

function pluginStore(plugins: readonly Plugin[]) {
  return {
    list: async () => plugins,
    remove: async () => null,
    upsert: async () => undefined
  };
}

function skillStore(skills: readonly Skill[]) {
  return {
    list: async () => skills,
    remove: async () => null,
    upsert: async () => undefined
  };
}

function installedPlugin(): Plugin {
  return {
    author: "Microsoft",
    category: "Programming Languages",
    description: "Python language support",
    downloads: 1234567,
    enabled: true,
    extensionName: "python",
    icon: "🔌",
    id: "vscode:ms-python.python",
    installed: true,
    installedPath: "/tmp/python.vsix",
    name: "Python",
    publisher: "ms-python",
    rating: 4.8,
    source: "vscode",
    version: "2026.5.1"
  };
}

function installedSkill(installedPath: string): Skill {
  return {
    author: "tomevault-io",
    category: "SkillsMP",
    color: "#3b82f6",
    description: "Demo Codex skill",
    enabled: true,
    icon: "Sparkles",
    id: "skillsmp-demo",
    installed: true,
    installedPath,
    name: "codex-demo",
    rating: 3,
    source: "skillsmp",
    version: "remote"
  };
}

async function tempDirectory(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

async function failFetch(url: string | URL | Request): Promise<Response> {
  throw new Error(`Unexpected network request: ${String(url)}`);
}
