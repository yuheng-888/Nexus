import type { InstallResult, Plugin, PluginSearchRequest, Skill, SkillsSearchRequest } from "../marketplaceContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";

export interface AgentMarketplaceToolProvider {
  installPlugin(args: Record<string, unknown>): Promise<string>;
  installSkill(args: Record<string, unknown>): Promise<string>;
  listInstalledPlugins(): Promise<string>;
  listInstalledSkills(): Promise<string>;
  previewInstallPlugin(args: Record<string, unknown>): Promise<string>;
  previewInstallSkill(args: Record<string, unknown>): Promise<string>;
  searchPlugins(args: Record<string, unknown>): Promise<string>;
  searchSkills(args: Record<string, unknown>): Promise<string>;
}

export interface MarketplaceToolService {
  getInstalledPlugins(): Promise<readonly Plugin[]>;
  getInstalledSkills(): Promise<readonly Skill[]>;
  getPlugins(request?: PluginSearchRequest): Promise<readonly Plugin[]>;
  getSkills(request?: SkillsSearchRequest): Promise<readonly Skill[]>;
  installPlugin(id: string): Promise<InstallResult>;
  installSkill(id: string): Promise<InstallResult>;
}

export class NativeAgentMarketplaceToolProvider implements AgentMarketplaceToolProvider {
  private readonly service: MarketplaceToolService;

  constructor(options: { readonly service: MarketplaceToolService }) {
    this.service = options.service;
  }

  async installPlugin(args: Record<string, unknown>): Promise<string> {
    return formatInstallResult(await this.service.installPlugin(readRequiredString(args, "id")));
  }

  async installSkill(args: Record<string, unknown>): Promise<string> {
    return formatInstallResult(await this.service.installSkill(readRequiredString(args, "id")));
  }

  async listInstalledPlugins(): Promise<string> {
    return formatPlugins(await this.service.getInstalledPlugins());
  }

  async listInstalledSkills(): Promise<string> {
    return formatSkills(await this.service.getInstalledSkills());
  }

  async previewInstallPlugin(args: Record<string, unknown>): Promise<string> {
    return `Install VS Code plugin: ${readRequiredString(args, "id")}`;
  }

  async previewInstallSkill(args: Record<string, unknown>): Promise<string> {
    return `Install SkillsMP skill: ${readRequiredString(args, "id")}`;
  }

  async searchPlugins(args: Record<string, unknown>): Promise<string> {
    return formatPlugins(await this.service.getPlugins(readPluginSearchRequest(args)));
  }

  async searchSkills(args: Record<string, unknown>): Promise<string> {
    return formatSkills(await this.service.getSkills(readSkillSearchRequest(args)));
  }
}

export function createMarketplaceToolSpecs(provider: AgentMarketplaceToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    readSpec(provider, {
      description: "Search VS Code Marketplace plugins.",
      method: "searchPlugins",
      name: "marketplace.plugins.search",
      parameters: "query?: string"
    }),
    readSpec(provider, {
      description: "List installed VS Code Marketplace plugins.",
      method: "listInstalledPlugins",
      name: "marketplace.plugins.installed",
      parameters: "none"
    }),
    writeSpec(provider, {
      description: "Install a VS Code Marketplace plugin.",
      name: "marketplace.plugins.install",
      parameters: "id: string",
      previewMethod: "previewInstallPlugin",
      runMethod: "installPlugin"
    }),
    readSpec(provider, {
      description: "Search SkillsMP skills.",
      method: "searchSkills",
      name: "marketplace.skills.search",
      parameters: "query?: string"
    }),
    readSpec(provider, {
      description: "List installed SkillsMP skills.",
      method: "listInstalledSkills",
      name: "marketplace.skills.installed",
      parameters: "none"
    }),
    writeSpec(provider, {
      description: "Install a SkillsMP skill.",
      name: "marketplace.skills.install",
      parameters: "id: string",
      previewMethod: "previewInstallSkill",
      runMethod: "installSkill"
    })
  ];
}

interface MarketplaceReadSpecConfig {
  readonly description: string;
  readonly method: keyof AgentMarketplaceToolProvider;
  readonly name: string;
  readonly parameters: string;
}

interface MarketplaceWriteSpecConfig {
  readonly description: string;
  readonly name: string;
  readonly parameters: string;
  readonly previewMethod: keyof AgentMarketplaceToolProvider;
  readonly runMethod: keyof AgentMarketplaceToolProvider;
}

function readSpec(provider: AgentMarketplaceToolProvider | undefined, config: MarketplaceReadSpecConfig): AgentInteractiveToolSpec {
  return {
    description: config.description,
    name: config.name,
    parameters: config.parameters,
    permission: "read",
    run: (args) => requireProvider(provider)[config.method](args)
  };
}

function writeSpec(provider: AgentMarketplaceToolProvider | undefined, config: MarketplaceWriteSpecConfig): AgentInteractiveToolSpec {
  return {
    description: config.description,
    name: config.name,
    parameters: config.parameters,
    permission: "write",
    preview: (args) => requireProvider(provider)[config.previewMethod](args),
    run: (args) => requireProvider(provider)[config.runMethod](args)
  };
}

function readPluginSearchRequest(args: Record<string, unknown>): PluginSearchRequest {
  return { query: readOptionalString(args, "query") };
}

function readSkillSearchRequest(args: Record<string, unknown>): SkillsSearchRequest {
  return { query: readOptionalString(args, "query") };
}

function formatPlugins(plugins: readonly Plugin[]): string {
  if (plugins.length === 0) return "No plugins found.";
  return plugins.map(formatPlugin).join("\n\n");
}

function formatPlugin(plugin: Plugin): string {
  return [
    `${plugin.id} [${plugin.source ?? "unknown"}] ${plugin.name}`,
    `author: ${plugin.author}`,
    `version: ${plugin.version}`,
    `installed: ${plugin.installed}`,
    `enabled: ${plugin.enabled}`,
    `downloads: ${plugin.downloads}`,
    `rating: ${plugin.rating}`,
    plugin.publisher === undefined ? "" : `publisher: ${plugin.publisher}`,
    plugin.extensionName === undefined ? "" : `extensionName: ${plugin.extensionName}`,
    plugin.marketplaceUrl === undefined ? "" : `url: ${plugin.marketplaceUrl}`,
    plugin.description === "" ? "" : `description: ${plugin.description}`
  ].filter(Boolean).join("\n");
}

function formatSkills(skills: readonly Skill[]): string {
  if (skills.length === 0) return "No skills found.";
  return skills.map(formatSkill).join("\n\n");
}

function formatSkill(skill: Skill): string {
  return [
    `${skill.id} [${skill.source ?? "unknown"}] ${skill.name}`,
    `author: ${skill.author}`,
    `version: ${skill.version}`,
    `installed: ${skill.installed}`,
    `enabled: ${skill.enabled}`,
    `rating: ${skill.rating}`,
    skill.githubUrl === undefined ? "" : `github: ${skill.githubUrl}`,
    skill.skillUrl === undefined ? "" : `url: ${skill.skillUrl}`,
    skill.description === "" ? "" : `description: ${skill.description}`
  ].filter(Boolean).join("\n");
}

function formatInstallResult(result: InstallResult): string {
  return [
    `success: ${result.success}`,
    result.message,
    result.installedPath === undefined ? "" : `installedPath: ${result.installedPath}`
  ].filter(Boolean).join("\n");
}

function requireProvider(provider: AgentMarketplaceToolProvider | undefined): AgentMarketplaceToolProvider {
  if (provider === undefined) throw new Error("Marketplace tools are not configured.");
  return provider;
}
