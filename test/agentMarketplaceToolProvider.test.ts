import { describe, expect, it } from "vitest";
import type { InstallResult, Plugin, PluginSearchRequest, Skill, SkillsSearchRequest } from "../src/marketplaceContracts.js";
import { NativeAgentMarketplaceToolProvider, type MarketplaceToolService } from "../src/main/agentMarketplaceTools.js";

class FakeMarketplaceService implements MarketplaceToolService {
  pluginInstalls: string[] = [];
  pluginSearches: PluginSearchRequest[] = [];
  skillInstalls: string[] = [];
  skillSearches: SkillsSearchRequest[] = [];

  async getInstalledPlugins(): Promise<readonly Plugin[]> {
    return [{ ...plugin(), installed: true }];
  }

  async getInstalledSkills(): Promise<readonly Skill[]> {
    return [{ ...skill(), installed: true }];
  }

  async getPlugins(request: PluginSearchRequest = {}): Promise<readonly Plugin[]> {
    this.pluginSearches = [...this.pluginSearches, request];
    return [plugin()];
  }

  async getSkills(request: SkillsSearchRequest = {}): Promise<readonly Skill[]> {
    this.skillSearches = [...this.skillSearches, request];
    return [skill()];
  }

  async installPlugin(id: string): Promise<InstallResult> {
    this.pluginInstalls = [...this.pluginInstalls, id];
    return { installedPath: "/tmp/python.vsix", message: "插件 Python 安装成功", success: true };
  }

  async installSkill(id: string): Promise<InstallResult> {
    this.skillInstalls = [...this.skillInstalls, id];
    return { installedPath: "/tmp/codex-demo", message: "技能 codex-demo 已启用", success: true };
  }
}

describe("NativeAgentMarketplaceToolProvider", () => {
  it("formats plugin and skill search, installed lists, and installs", async () => {
    const service = new FakeMarketplaceService();
    const provider = new NativeAgentMarketplaceToolProvider({ service });

    const plugins = await provider.searchPlugins({ query: "python" });
    const installedPlugins = await provider.listInstalledPlugins();
    const pluginPreview = await provider.previewInstallPlugin({ id: "vscode:ms-python.python" });
    const pluginInstall = await provider.installPlugin({ id: "vscode:ms-python.python" });
    const skills = await provider.searchSkills({ query: "codex" });
    const installedSkills = await provider.listInstalledSkills();
    const skillPreview = await provider.previewInstallSkill({ id: "skillsmp-demo" });
    const skillInstall = await provider.installSkill({ id: "skillsmp-demo" });

    expect(plugins).toContain("vscode:ms-python.python [vscode] Python");
    expect(installedPlugins).toContain("installed: true");
    expect(pluginPreview).toBe("Install VS Code plugin: vscode:ms-python.python");
    expect(pluginInstall).toContain("installedPath: /tmp/python.vsix");
    expect(skills).toContain("skillsmp-demo [skillsmp] codex-demo");
    expect(installedSkills).toContain("installed: true");
    expect(skillPreview).toBe("Install SkillsMP skill: skillsmp-demo");
    expect(skillInstall).toContain("installedPath: /tmp/codex-demo");
    expect(service.pluginSearches).toEqual([{ query: "python" }]);
    expect(service.skillSearches).toEqual([{ query: "codex" }]);
    expect(service.pluginInstalls).toEqual(["vscode:ms-python.python"]);
    expect(service.skillInstalls).toEqual(["skillsmp-demo"]);
  });
});

function plugin(): Plugin {
  return {
    author: "Microsoft",
    category: "Programming Languages",
    description: "Python language support",
    downloads: 123,
    enabled: false,
    extensionName: "python",
    icon: "Package",
    id: "vscode:ms-python.python",
    installed: false,
    marketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=ms-python.python",
    name: "Python",
    publisher: "ms-python",
    rating: 4.8,
    source: "vscode",
    version: "2026.5.1"
  };
}

function skill(): Skill {
  return {
    author: "tomevault-io",
    category: "SkillsMP",
    color: "#3b82f6",
    description: "Demo Codex skill",
    enabled: false,
    githubUrl: "https://github.com/tomevault-io/skills-registry/tree/main/demo--skill",
    icon: "Sparkles",
    id: "skillsmp-demo",
    installed: false,
    name: "codex-demo",
    rating: 3,
    skillUrl: "https://skillsmp.com/skills/skillsmp-demo",
    source: "skillsmp",
    version: "latest"
  };
}
