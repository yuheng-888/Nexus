export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly version: string;
  readonly downloads: number;
  readonly rating: number;
  readonly category: string;
  readonly icon: string;
  readonly installed: boolean;
  readonly enabled: boolean;
  readonly contributions?: PluginContributionSummary;
  readonly extensionPath?: string;
  readonly extensionName?: string;
  readonly installedPath?: string;
  readonly manifestPath?: string;
  readonly marketplaceUrl?: string;
  readonly publisher?: string;
  readonly source?: "vscode";
  readonly updatedAt?: string;
  readonly vsixUrl?: string;
}

export interface PluginContributionSummary {
  readonly activationEvents: readonly string[];
  readonly commands: readonly string[];
  readonly configurationKeys: readonly string[];
  readonly grammars: readonly string[];
  readonly keybindings: readonly string[];
  readonly languages: readonly string[];
  readonly menus: readonly string[];
  readonly snippets: readonly string[];
  readonly themes: readonly string[];
}

export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly version: string;
  readonly rating: number;
  readonly category: string;
  readonly icon: string;
  readonly installed: boolean;
  readonly enabled: boolean;
  readonly color: string;
  readonly githubUrl?: string;
  readonly installedPath?: string;
  readonly skillUrl?: string;
  readonly source?: "builtin" | "skillsmp";
  readonly updatedAt?: string;
}

export interface InstallResult {
  readonly success: boolean;
  readonly message: string;
  readonly installedPath?: string;
}

export interface SkillsSearchRequest {
  readonly query?: string;
}

export interface PluginSearchRequest {
  readonly query?: string;
}
