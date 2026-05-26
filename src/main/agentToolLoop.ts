import type { ApiConfig } from "../contracts.js";
import type { AgentModelClient, AgentModelMessage, AgentModelResponse } from "./agentModelClient.js";
import type { AgentToolApprovalProvider } from "./agentToolApproval.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolRunner } from "./agentInteractiveTools.js";
import { parseAgentToolCalls, type AgentToolCall } from "./agentToolProtocol.js";
import type { AgentToolResult } from "./agentTools.js";

export const MAX_TOOL_ROUNDS = 8;

export interface AgentToolLoopInput {
  readonly approval: AgentToolApprovalProvider;
  readonly config: ApiConfig;
  readonly context: AgentInteractiveToolContext;
  readonly emit: (type: string, payload: object) => void;
  readonly messages: readonly AgentModelMessage[];
  readonly modelClient: AgentModelClient;
  readonly signal: AbortSignal;
  readonly toolRunner: AgentInteractiveToolRunner;
}

export async function runAgentToolLoop(input: AgentToolLoopInput): Promise<AgentModelResponse> {
  let messages = input.messages;
  let toolRounds = 0;

  while (true) {
    throwIfAborted(input.signal);
    const response = await input.modelClient.complete({ config: input.config, messages });
    const calls = parseAgentToolCalls(response.text);

    if (calls.length === 0) return response;
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      throw new Error(`Nexus native tool loop exceeded ${MAX_TOOL_ROUNDS} rounds`);
    }

    toolRounds += 1;
    messages = [
      ...messages,
      { content: response.text, role: "assistant" },
      ...await runToolCalls(input, calls)
    ];
  }
}

async function runToolCalls(
  input: AgentToolLoopInput,
  calls: readonly AgentToolCall[]
): Promise<readonly AgentModelMessage[]> {
  const messages: AgentModelMessage[] = [];

  for (const call of calls) {
    input.emit("agent.tool.requested", {
      arguments: call.arguments,
      id: call.id,
      name: call.name
    });
    const result = await runApprovedToolCall(input, call);
    input.emit("agent.tool.completed", { ...result, id: call.id });
    messages.push({ content: formatToolResult(call.id, result), role: "user" });
  }

  return messages;
}

async function runApprovedToolCall(input: AgentToolLoopInput, call: AgentToolCall): Promise<AgentToolResult> {
  const tool = input.toolRunner.getToolDefinition(call.name);
  if (tool?.permission !== "write") {
    return input.toolRunner.runToolCall(call, input.context);
  }

  const preview = await input.toolRunner.previewToolCall(call, input.context);
  const decisionPromise = input.approval.requestApproval({ call, preview, tool });
  input.emit("agent.tool.approval_requested", {
    arguments: call.arguments,
    id: call.id,
    name: call.name,
    preview
  });
  const decision = await decisionPromise;
  input.emit("agent.tool.approval_resolved", {
    approved: decision.approved,
    id: call.id,
    name: call.name,
    reason: decision.reason ?? null
  });

  if (!decision.approved) {
    return { name: call.name, ok: false, output: `Tool denied by user: ${decision.reason ?? "No reason provided"}` };
  }

  return input.toolRunner.runToolCall(call, input.context);
}

function formatToolResult(id: string, result: AgentToolResult): string {
  return JSON.stringify({
    id,
    name: result.name,
    ok: result.ok,
    output: result.output,
    type: "nexus.tool_result"
  }, null, 2);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("Agent run was aborted");
}
