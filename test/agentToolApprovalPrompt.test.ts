import { describe, expect, it } from "vitest";
import { readToolApprovalRequests } from "../frontend/src/components/ai/AgentToolApprovalPrompt.js";

describe("readToolApprovalRequests", () => {
  it("extracts approval prompts from native agent events", () => {
    const events = [
      JSON.stringify({ type: "agent.tool.requested", id: "read", name: "workspace.read_file" }),
      JSON.stringify({
        id: "write-note",
        name: "workspace.write_file",
        preview: "Overwrite src/note.txt",
        type: "agent.tool.approval_requested"
      })
    ].join("\n");

    expect(readToolApprovalRequests(events)).toEqual([
      {
        id: "write-note",
        name: "workspace.write_file",
        preview: "Overwrite src/note.txt"
      }
    ]);
  });
});
