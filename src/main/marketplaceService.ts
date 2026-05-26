import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { InstallResult, Plugin, PluginSearchRequest, Skill, SkillsSearchRequest } from "../contracts.js";
import { PluginInstallStore } from "./pluginInstallStore.js";
import { SkillInstallStore } from "./skillInstallStore.js";
import { installGitHubSkill } from "./skillInstaller.js";
import { type FetchLike, searchSkillsMpSkills } from "./skillsMpClient.js";
import { installVsCodePlugin, type VsCodePluginInstallResult } from "./vscodePluginInstaller.js";
import { searchVsCodeMarketplace } from "./vscodeMarketplaceClient.js";

const BUILTIN_SKILLS: Skill[] = [
  { id: "code-review", name: "代码审查专家", description: "自动分析代码质量，发现潜在问题并提供改进建议", author: "Nexus", version: "1.2.0", rating: 4.9, category: "代码质量", icon: "Code", installed: true, enabled: true, color: "#8b5cf6", source: "builtin" },
  { id: "debug-assist", name: "智能调试助手", description: "分析错误日志和堆栈跟踪，快速定位和修复 Bug", author: "Nexus", version: "1.1.0", rating: 4.8, category: "调试", icon: "Zap", installed: true, enabled: true, color: "#f59e0b", source: "builtin" },
  { id: "doc-generator", name: "文档生成器", description: "自动生成 API 文档、README 和注释", author: "Community", version: "2.0.3", rating: 4.7, category: "文档", icon: "Globe", installed: false, enabled: false, color: "#3b82f6", source: "builtin" },
  { id: "test-writer", name: "测试编写助手", description: "根据代码自动生成单元测试和集成测试", author: "Nexus", version: "1.0.5", rating: 4.6, category: "测试", icon: "Shield", installed: false, enabled: false, color: "#10b981", source: "builtin" },
];

export interface MarketplaceServiceOptions {
  readonly fetch?: FetchLike;
  readonly pluginStore?: PluginStateStore;
  readonly skillStore?: SkillStateStore;
  readonly pluginsDir?: string;
  readonly skillsDir?: string;
}

export interface PluginStateStore {
  list(): Promise<readonly Plugin[]>;
  remove(id: string): Promise<Plugin | null>;
  upsert(plugin: Plugin): Promise<void>;
}

export interface SkillStateStore {
  list(): Promise<readonly Skill[]>;
  remove(id: string): Promise<Skill | null>;
  upsert(skill: Skill): Promise<void>;
}

export class MarketplaceService {
  private plugins: Plugin[] = [];
  private skills: Skill[] = [...BUILTIN_SKILLS];
  private readonly fetcher: FetchLike;
  private readonly pluginStore: PluginStateStore;
  private readonly skillStore: SkillStateStore;
  private readonly pluginsDir: string;
  private readonly skillsDir: string;

  constructor(options: MarketplaceServiceOptions = {}) {
    this.fetcher = options.fetch ?? fetch;
    this.pluginsDir = options.pluginsDir ?? join(homedir(), ".nexus", "extensions");
    this.pluginStore = options.pluginStore ?? new PluginInstallStore(this.pluginsDir);
    this.skillsDir = options.skillsDir ?? join(homedir(), ".codex", "skills");
    this.skillStore = options.skillStore ?? new SkillInstallStore(this.skillsDir);
  }

  async getPlugins(request: PluginSearchRequest = {}): Promise<Plugin[]> {
    const remotePlugins = await searchVsCodeMarketplace(request, this.fetcher);
    const installedPlugins = await this.pluginStore.list();
    this.plugins = mergePlugins(remotePlugins, [...this.plugins, ...installedPlugins]);
    return this.plugins;
  }

  async getInstalledPlugins(): Promise<Plugin[]> {
    return [...await this.pluginStore.list()];
  }

  async getSkills(request: SkillsSearchRequest = {}): Promise<Skill[]> {
    const remoteSkills = await searchSkillsMpSkills(request, this.fetcher);
    const installedSkills = await this.skillStore.list();
    this.skills = mergeSkills(remoteSkills, [...this.skills, ...installedSkills]);
    return this.skills;
  }

  async getInstalledSkills(): Promise<Skill[]> {
    return [...await this.skillStore.list()];
  }

  async installPlugin(id: string): Promise<InstallResult> {
    const plugin = this.plugins.find((p) => p.id === id);
    if (!plugin) return { success: false, message: `插件 ${id} 不存在` };
    if (plugin.installed) return { success: false, message: `插件 ${plugin.name} 已安装` };
    const installation = await this.installKnownPlugin(plugin);
    const installedPlugin = { ...plugin, enabled: true, installed: true, ...installation };
    await this.pluginStore.upsert(installedPlugin);
    this.plugins = this.plugins.map((p) =>
      p.id === id ? installedPlugin : p
    );
    return { installedPath: installation.installedPath, message: `插件 ${plugin.name} 安装成功`, success: true };
  }

  async uninstallPlugin(id: string): Promise<InstallResult> {
    const plugin = this.plugins.find((p) => p.id === id);
    if (!plugin) return { success: false, message: `插件 ${id} 不存在` };
    if (!plugin.installed) return { success: false, message: `插件 ${plugin.name} 未安装` };
    if (plugin.installedPath === undefined || plugin.installedPath === "") {
      throw new Error(`插件 ${plugin.name} 缺少安装路径`);
    }

    await removeInstalledPluginFiles(plugin.installedPath);
    await this.pluginStore.remove(id);
    this.plugins = this.plugins.map((p) =>
      p.id === id ? { ...p, installed: false, enabled: false } : p
    );
    return { success: true, message: `插件 ${plugin.name} 已卸载` };
  }

  async togglePlugin(id: string): Promise<InstallResult> {
    const plugin = this.plugins.find((p) => p.id === id);
    if (!plugin) return { success: false, message: `插件 ${id} 不存在` };
    if (!plugin.installed) return { success: false, message: `请先安装插件 ${plugin.name}` };
    const newEnabled = !plugin.enabled;
    const updatedPlugin = { ...plugin, enabled: newEnabled, installed: true };
    await this.pluginStore.upsert(updatedPlugin);
    this.plugins = this.plugins.map((p) =>
      p.id === id ? updatedPlugin : p
    );
    return { success: true, message: `插件 ${plugin.name} 已${newEnabled ? "启用" : "禁用"}` };
  }

  async installSkill(id: string): Promise<InstallResult> {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) return { success: false, message: `技能 ${id} 不存在` };
    if (skill.installed) return { success: false, message: `技能 ${skill.name} 已启用` };
    return this.installKnownSkill(skill);
  }

  async uninstallSkill(id: string): Promise<InstallResult> {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) return { success: false, message: `技能 ${id} 不存在` };
    if (!skill.installed) return { success: false, message: `技能 ${skill.name} 未启用` };
    await this.removeInstalledSkill(skill);
    this.skills = this.skills.map((s) =>
      s.id === id ? { ...s, installed: false, enabled: false } : s
    );
    return { success: true, message: `技能 ${skill.name} 已禁用` };
  }

  async toggleSkill(id: string): Promise<InstallResult> {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) return { success: false, message: `技能 ${id} 不存在` };
    if (!skill.installed) return { success: false, message: `请先启用技能 ${skill.name}` };
    const updatedSkill = { ...skill, enabled: !skill.enabled, installed: true };
    await this.persistRemoteSkill(updatedSkill);
    this.skills = this.skills.map((s) =>
      s.id === id ? updatedSkill : s
    );
    return { success: true, message: `技能 ${skill.name} 已${updatedSkill.enabled ? "启用" : "禁用"}` };
  }

  private async installKnownSkill(skill: Skill): Promise<InstallResult> {
    const installedPath = await this.installRemoteSkill(skill);
    const installedSkill = { ...skill, enabled: true, installed: true, installedPath };
    await this.persistRemoteSkill(installedSkill);
    this.skills = this.skills.map((s) =>
      s.id === skill.id ? installedSkill : s
    );
    return { installedPath, message: `技能 ${skill.name} 已启用`, success: true };
  }

  private async installKnownPlugin(plugin: Plugin): Promise<VsCodePluginInstallResult> {
    if (plugin.source !== "vscode") {
      throw new Error(`插件 ${plugin.name} 缺少 VS Code Marketplace 来源`);
    }

    return installVsCodePlugin({
      fetch: this.fetcher,
      plugin,
      pluginsDir: this.pluginsDir
    });
  }

  private async installRemoteSkill(skill: Skill): Promise<string | undefined> {
    if (skill.source !== "skillsmp") {
      return undefined;
    }

    if (skill.githubUrl === undefined || skill.githubUrl === "") {
      throw new Error(`技能 ${skill.name} 缺少 GitHub 来源`);
    }

    return installGitHubSkill({
      fetch: this.fetcher,
      githubUrl: skill.githubUrl,
      name: skill.name,
      skillsDir: this.skillsDir
    });
  }

  private async persistRemoteSkill(skill: Skill): Promise<void> {
    if (skill.source === "skillsmp") await this.skillStore.upsert(skill);
  }

  private async removeInstalledSkill(skill: Skill): Promise<void> {
    if (skill.source !== "skillsmp") return;
    if (skill.installedPath !== undefined && skill.installedPath !== "") {
      await rm(skill.installedPath, { recursive: true });
    }

    await this.skillStore.remove(skill.id);
  }
}

async function removeInstalledPluginFiles(installedPath: string): Promise<void> {
  await rm(installedPath);
  await rm(join(dirname(installedPath), "extension"), { force: true, recursive: true });
}

function mergeSkills(remoteSkills: Skill[], currentSkills: Skill[]): Skill[] {
  const currentById = new Map(currentSkills.map((skill) => [skill.id, skill]));
  const mergedRemote = remoteSkills.map((skill) => ({ ...skill, ...currentById.get(skill.id) }));
  const remoteIds = new Set(remoteSkills.map((skill) => skill.id));
  const localOnly = currentSkills.filter((skill) => !remoteIds.has(skill.id));

  return [...mergedRemote, ...localOnly];
}

function mergePlugins(remotePlugins: readonly Plugin[], currentPlugins: readonly Plugin[]): Plugin[] {
  const currentById = new Map(currentPlugins.map((plugin) => [plugin.id, plugin]));
  const remoteIds = new Set(remotePlugins.map((plugin) => plugin.id));
  const localOnly = currentPlugins.filter((plugin) => plugin.installed && !remoteIds.has(plugin.id));
  const localById = new Map(localOnly.map((plugin) => [plugin.id, plugin]));

  return [...remotePlugins.map((plugin) => ({
    ...plugin,
    ...getInstalledState(currentById.get(plugin.id))
  })), ...localById.values()];
}

function getInstalledState(plugin: Plugin | undefined): Partial<Plugin> {
  if (plugin === undefined) {
    return {};
  }

  return {
    contributions: plugin.contributions,
    enabled: plugin.enabled,
    extensionPath: plugin.extensionPath,
    installed: plugin.installed,
    installedPath: plugin.installedPath,
    manifestPath: plugin.manifestPath
  };
}
