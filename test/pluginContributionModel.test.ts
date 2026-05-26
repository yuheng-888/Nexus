import { describe, expect, it } from "vitest";
import type { PluginContributionSummary } from "../frontend/src/types/nexus";
import { pluginContributionBadges } from "../frontend/src/components/sidebar/pluginContributionModel";

describe("pluginContributionBadges", () => {
  it("summarizes non-empty VS Code contribution groups for plugin cards", () => {
    const contributions: PluginContributionSummary = {
      activationEvents: ["onLanguage:python"],
      commands: ["Python: Select Interpreter"],
      configurationKeys: ["python.analysis.typeCheckingMode"],
      grammars: ["source.python"],
      keybindings: ["python.setInterpreter"],
      languages: ["python"],
      menus: ["commandPalette"],
      snippets: ["python"],
      themes: []
    };

    expect(pluginContributionBadges(contributions)).toEqual([
      { label: "命令", value: 1 },
      { label: "语言", value: 1 },
      { label: "片段", value: 1 },
      { label: "语法", value: 1 },
      { label: "配置", value: 1 },
      { label: "菜单", value: 1 },
      { label: "快捷键", value: 1 },
      { label: "激活", value: 1 }
    ]);
  });
});
