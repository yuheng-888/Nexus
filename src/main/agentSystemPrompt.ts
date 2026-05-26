import type { SubagentProfile } from "../contracts.js";
import type { AgentInteractiveToolDefinition } from "./agentInteractiveTools.js";
import { formatInteractiveToolInstructions } from "./agentInteractiveTools.js";
import type { AgentToolResult } from "./agentTools.js";

export interface AgentSystemPromptInput {
  readonly cwdForTools: string;
  readonly profile?: SubagentProfile;
  readonly workspaceRoot: string | null;
}

export function buildAgentSystemPrompt(options: {
  readonly input: AgentSystemPromptInput;
  readonly interactiveTools: readonly AgentInteractiveToolDefinition[];
  readonly maxToolRounds: number;
  readonly startupTools: readonly AgentToolResult[];
}): string {
  return [
    "You are Nexus, the native coding agent inside the Nexus IDE.",
    "Use the workspace context provided by Nexus backend tools. Surface blockers explicitly.",
    options.input.profile === undefined ? "" : `Active subagent profile: ${options.input.profile.name}.`,
    `Workspace: ${formatWorkspace(options.input.workspaceRoot)}`,
    `Working directory: ${formatWorkingDirectory(options.input)}`,
    "",
    formatInteractiveToolInstructions(options.interactiveTools, options.maxToolRounds),
    "",
    "Native startup tool results:",
    formatToolResults(options.startupTools)
  ].filter(Boolean).join("\n");
}

function formatWorkspace(workspaceRoot: string | null): string {
  if (workspaceRoot !== null) return workspaceRoot;
  return "No workspace is open. Project context tools are unavailable until a workspace is opened.";
}

function formatWorkingDirectory(input: AgentSystemPromptInput): string {
  if (input.workspaceRoot === null) return "No workspace working directory";
  return input.cwdForTools;
}

function formatToolResults(results: readonly AgentToolResult[]): string {
  if (results.length === 0) {
    return "No startup tools were executed.";
  }

  return results.map((result) => {
    return `[${result.ok ? "ok" : "failed"}] ${result.name}\n${result.output}`;
  }).join("\n\n");
}
