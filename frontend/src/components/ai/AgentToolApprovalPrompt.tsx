import React from "react";
import { Check, X } from "lucide-react";

export interface PendingAgentToolApproval {
  readonly id: string;
  readonly name: string;
  readonly preview: string;
  readonly sessionId: string;
}

export function readToolApprovalRequests(data: string): readonly Omit<PendingAgentToolApproval, "sessionId">[] {
  return data.split(/\r?\n/).filter(Boolean).flatMap(readToolApprovalLine);
}

export function AgentToolApprovalPrompt(props: {
  readonly approval: PendingAgentToolApproval;
  readonly onResolve: (approved: boolean) => void;
}) {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={nameStyle}>{props.approval.name}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => props.onResolve(false)} style={buttonStyle("deny")} title="拒绝" type="button">
            <X size={14} />
          </button>
          <button onClick={() => props.onResolve(true)} style={buttonStyle("approve")} title="允许" type="button">
            <Check size={14} />
          </button>
        </div>
      </div>
      <pre style={previewStyle}>{props.approval.preview}</pre>
    </div>
  );
}

function readToolApprovalLine(line: string): readonly Omit<PendingAgentToolApproval, "sessionId">[] {
  const event = parseJson(line);
  if (event?.type !== "agent.tool.approval_requested") return [];
  if (typeof event.id !== "string" || typeof event.name !== "string") return [];
  return [{ id: event.id, name: event.name, preview: typeof event.preview === "string" ? event.preview : "" }];
}

function parseJson(line: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(line) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const containerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border-subtle)",
  padding: "8px 12px"
};

const headerStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 6
};

const nameStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 600
};

const previewStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.45,
  margin: 0,
  maxHeight: 150,
  overflow: "auto",
  padding: 8,
  whiteSpace: "pre-wrap"
};

function buttonStyle(kind: "approve" | "deny"): React.CSSProperties {
  return {
    alignItems: "center",
    background: kind === "approve" ? "var(--accent)" : "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-sm)",
    color: kind === "approve" ? "white" : "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    height: 24,
    justifyContent: "center",
    width: 28
  };
}
