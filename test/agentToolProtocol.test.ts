import { describe, expect, it } from "vitest";
import { parseAgentToolCalls } from "../src/main/agentToolProtocol.js";

describe("parseAgentToolCalls", () => {
  it("extracts Nexus tool calls from mixed assistant text", () => {
    const calls = parseAgentToolCalls([
      "I need to inspect a file first.",
      JSON.stringify({
        arguments: { path: "src/app.ts" },
        id: "read-app",
        name: "workspace.read_file",
        type: "nexus.tool_call"
      }),
      "Then I can answer."
    ].join("\n"));

    expect(calls).toEqual([
      {
        arguments: { path: "src/app.ts" },
        id: "read-app",
        name: "workspace.read_file"
      }
    ]);
  });

  it("generates stable ids when the model omits them", () => {
    const calls = parseAgentToolCalls(JSON.stringify({
      arguments: { query: "ApiConfigService" },
      name: "workspace.search",
      type: "nexus.tool_call"
    }));

    expect(calls).toEqual([
      {
        arguments: { query: "ApiConfigService" },
        id: "tool-1",
        name: "workspace.search"
      }
    ]);
  });
});
