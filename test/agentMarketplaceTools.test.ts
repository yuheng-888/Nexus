import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

class FakeMarketplaceProvider {
  pluginInstalls: Record<string, unknown>[] = [];
  skillInstalls: Record<string, unknown>[] = [];

  async installPlugin(args: Record<string, unknown>): Promise<string> {
    this.pluginInstalls = [...this.pluginInstalls, args];
    return "success: true\n插件 Python 安装成功";
  }

  async installSkill(args: Record<string, unknown>): Promise<string> {
    this.skillInstalls = [...this.skillInstalls, args];
    return "success: true\n技能 codex-demo 已启用";
  }

  async listInstalledPlugins(): Promise<string> {
    return "vscode:ms-python.python [vscode] Python";
  }

  async listInstalledSkills(): Promise<string> {
    return "skillsmp-demo [skillsmp] codex-demo";
  }

  async previewInstallPlugin(args: Record<string, unknown>): Promise<string> {
    return `Install VS Code plugin: ${String(args.id)}`;
  }

  async previewInstallSkill(args: Record<string, unknown>): Promise<string> {
    return `Install SkillsMP skill: ${String(args.id)}`;
  }

  async searchPlugins(args: Record<string, unknown>): Promise<string> {
    return `vscode:ms-python.python [vscode] Python\nquery: ${String(args.query)}`;
  }

  async searchSkills(args: Record<string, unknown>): Promise<string> {
    return `skillsmp-demo [skillsmp] codex-demo\nquery: ${String(args.query)}`;
  }
}

describe("NativeAgentInteractiveToolRunner marketplace tools", () => {
  it("searches and lists installed marketplace entries as read-only native tools", async () => {
    const provider = new FakeMarketplaceProvider();
    const runner = new NativeAgentInteractiveToolRunner({ marketplace: provider });

    const plugins = await runner.runToolCall(toolCall("marketplace.plugins.search", { query: "python" }), fakeContext());
    const installedPlugins = await runner.runToolCall(toolCall("marketplace.plugins.installed", {}), fakeContext());
    const skills = await runner.runToolCall(toolCall("marketplace.skills.search", { query: "codex" }), fakeContext());
    const installedSkills = await runner.runToolCall(toolCall("marketplace.skills.installed", {}), fakeContext());

    expect(runner.getToolDefinition("marketplace.plugins.search")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("marketplace.plugins.installed")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("marketplace.skills.search")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("marketplace.skills.installed")).toMatchObject({ permission: "read" });
    expect(plugins.output).toContain("vscode:ms-python.python");
    expect(installedPlugins.output).toContain("Python");
    expect(skills.output).toContain("skillsmp-demo");
    expect(installedSkills.output).toContain("codex-demo");
  });

  it("marks plugin and skill installation as approval-gated write tools", async () => {
    const provider = new FakeMarketplaceProvider();
    const runner = new NativeAgentInteractiveToolRunner({ marketplace: provider });
    const pluginInstall = toolCall("marketplace.plugins.install", { id: "vscode:ms-python.python" });
    const skillInstall = toolCall("marketplace.skills.install", { id: "skillsmp-demo" });

    const pluginPreview = await runner.previewToolCall(pluginInstall, fakeContext());
    const pluginResult = await runner.runToolCall(pluginInstall, fakeContext());
    const skillPreview = await runner.previewToolCall(skillInstall, fakeContext());
    const skillResult = await runner.runToolCall(skillInstall, fakeContext());

    expect(runner.getToolDefinition("marketplace.plugins.install")).toMatchObject({ permission: "write" });
    expect(runner.getToolDefinition("marketplace.skills.install")).toMatchObject({ permission: "write" });
    expect(pluginPreview).toBe("Install VS Code plugin: vscode:ms-python.python");
    expect(pluginResult.output).toContain("插件 Python 安装成功");
    expect(skillPreview).toBe("Install SkillsMP skill: skillsmp-demo");
    expect(skillResult.output).toContain("技能 codex-demo 已启用");
    expect(provider.pluginInstalls).toEqual([{ id: "vscode:ms-python.python" }]);
    expect(provider.skillInstalls).toEqual([{ id: "skillsmp-demo" }]);
  });
});

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}

function fakeContext(): AgentInteractiveToolContext {
  return {
    cwd: ".",
    files: {} as AgentInteractiveToolContext["files"],
    git: {} as AgentInteractiveToolContext["git"],
    prompt: "",
    search: {} as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}
