import type { AgentInteractiveToolDefinition } from "./agentInteractiveTools.js";
import type { AgentToolCall } from "./agentToolProtocol.js";
import type { RuntimeSessionController } from "./sessionManager.js";

export interface AgentToolApprovalRequest {
  readonly call: AgentToolCall;
  readonly preview: string;
  readonly tool: AgentInteractiveToolDefinition;
}

export interface AgentToolApprovalDecision {
  readonly approved: boolean;
  readonly reason?: string;
}

export interface AgentToolApprovalProvider {
  requestApproval(request: AgentToolApprovalRequest): Promise<AgentToolApprovalDecision>;
}

interface PendingApproval {
  readonly reject: (error: Error) => void;
  readonly resolve: (decision: AgentToolApprovalDecision) => void;
}

export function createSessionToolApproval(controller: RuntimeSessionController): AgentToolApprovalProvider {
  const pending = new Map<string, PendingApproval>();
  let buffer = "";

  controller.onInput((data) => {
    buffer += data;
    const parsed = parseInputLines(buffer);
    buffer = parsed.remainder;
    for (const message of parsed.messages) resolveApproval(message, pending);
  });
  controller.signal.addEventListener("abort", () => rejectPending(pending));

  return {
    requestApproval: (request) => waitForApproval(request.call.id, pending, controller.signal)
  };
}

function waitForApproval(
  id: string,
  pending: Map<string, PendingApproval>,
  signal: AbortSignal
): Promise<AgentToolApprovalDecision> {
  if (signal.aborted) throw new Error("Agent run was aborted");
  return new Promise((resolve, reject) => pending.set(id, { reject, resolve }));
}

function parseInputLines(buffer: string): {
  readonly messages: readonly Record<string, unknown>[];
  readonly remainder: string;
} {
  const lines = buffer.split(/\r?\n/);
  const remainder = lines.pop() ?? "";
  return {
    messages: lines.flatMap(parseApprovalLine),
    remainder
  };
}

function parseApprovalLine(line: string): readonly Record<string, unknown>[] {
  if (line.trim() === "") return [];
  const value = JSON.parse(line) as unknown;
  return isRecord(value) ? [value] : [];
}

function resolveApproval(message: Record<string, unknown>, pending: Map<string, PendingApproval>): void {
  if (message.type !== "agent.tool.approval" || typeof message.id !== "string") return;
  const approval = pending.get(message.id);
  if (approval === undefined) return;

  pending.delete(message.id);
  approval.resolve({
    approved: message.approved === true,
    reason: typeof message.reason === "string" ? message.reason : undefined
  });
}

function rejectPending(pending: Map<string, PendingApproval>): void {
  for (const approval of pending.values()) {
    approval.reject(new Error("Agent run was aborted"));
  }
  pending.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
