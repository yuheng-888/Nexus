import type { ProjectScript, ScriptDiscoveryResult, ScriptRunRequest, ScriptRunResult } from "../scriptContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readRequiredString } from "./agentToolArgs.js";
import type { ScriptService } from "./scriptService.js";

export interface AgentScriptToolProvider {
  discoverScripts(): Promise<string>;
  previewRunScript(args: Record<string, unknown>): Promise<string>;
  runScript(args: Record<string, unknown>): Promise<string>;
}

export class NativeAgentScriptToolProvider implements AgentScriptToolProvider {
  private readonly service: ScriptService;

  constructor(options: { readonly service: ScriptService }) {
    this.service = options.service;
  }

  async discoverScripts(): Promise<string> {
    return formatDiscovery(await this.service.discover());
  }

  async previewRunScript(args: Record<string, unknown>): Promise<string> {
    return `Run npm script: ${readRunRequest(args).name}`;
  }

  async runScript(args: Record<string, unknown>): Promise<string> {
    return formatRunResult(await this.service.run(readRunRequest(args)));
  }
}

export function createScriptToolSpecs(provider: AgentScriptToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "Discover npm package scripts in the current workspace.",
      name: "scripts.discover",
      parameters: "none",
      permission: "read",
      run: () => requireProvider(provider).discoverScripts()
    },
    {
      description: "Run an npm package script in the current workspace.",
      name: "scripts.run",
      parameters: "name: string",
      permission: "write",
      preview: (args) => requireProvider(provider).previewRunScript(args),
      run: (args) => requireProvider(provider).runScript(args)
    }
  ];
}

function readRunRequest(args: Record<string, unknown>): ScriptRunRequest {
  return { name: readRequiredString(args, "name") };
}

function formatDiscovery(discovery: ScriptDiscoveryResult): string {
  return [
    `packageManager: ${discovery.packageManager}`,
    `scripts: ${discovery.scripts.length}`,
    ...discovery.scripts.map(formatScript)
  ].join("\n");
}

function formatScript(script: ProjectScript): string {
  return `${script.name}: ${script.command}`;
}

function formatRunResult(result: ScriptRunResult): string {
  return [
    result.passed ? "passed" : `failed exitCode=${result.exitCode}`,
    `command: ${result.command}`,
    `script: ${result.script.name}`,
    `durationMs: ${result.durationMs}`,
    result.stdout.trimEnd() === "" ? "stdout: <empty>" : `stdout:\n${result.stdout.trimEnd()}`,
    result.stderr.trimEnd() === "" ? "" : `stderr:\n${result.stderr.trimEnd()}`
  ].filter(Boolean).join("\n");
}

function requireProvider(provider: AgentScriptToolProvider | undefined): AgentScriptToolProvider {
  if (provider === undefined) throw new Error("Script tools are not configured.");
  return provider;
}
