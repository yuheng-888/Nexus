import type { PluginContributionSummary } from "../../types/nexus";

export interface PluginContributionBadge {
  readonly label: string;
  readonly value: number;
}

export function pluginContributionBadges(
  contributions: PluginContributionSummary | undefined
): readonly PluginContributionBadge[] {
  if (contributions === undefined) return [];

  return [
    badge("命令", contributions.commands),
    badge("语言", contributions.languages),
    badge("片段", contributions.snippets),
    badge("语法", contributions.grammars),
    badge("主题", contributions.themes),
    badge("配置", contributions.configurationKeys),
    badge("菜单", contributions.menus),
    badge("快捷键", contributions.keybindings),
    badge("激活", contributions.activationEvents)
  ].filter(isPresent);
}

function badge(label: string, values: readonly string[]): PluginContributionBadge | null {
  return values.length === 0 ? null : { label, value: values.length };
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
