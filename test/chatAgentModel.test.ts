import { describe, expect, it } from "vitest";
import {
  getFinalAgentOutput,
  getModelStartOptions,
  getStreamingAgentOutput,
  parseAgentOutput
} from "../frontend/src/components/ai/agentOutput.js";
import type { ApiConfig } from "../frontend/src/types/nexus.js";

const config: ApiConfig = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  enabled: true,
  id: "openai-default",
  maxTokens: 8192,
  model: "gpt-5-codex",
  name: "OpenAI",
  provider: "openai",
  temperature: 0.2
};

describe("getModelStartOptions", () => {
  it("passes the selected model into Nexus subagents", () => {
    expect(getModelStartOptions("subagent", config)).toEqual({ model: "gpt-5-codex" });
  });

  it("passes the selected model into Nexus main assistant sessions", () => {
    expect(getModelStartOptions("main", config)).toEqual({ model: "gpt-5-codex" });
  });
});

describe("parseAgentOutput", () => {
  it("hides native tool events instead of showing raw JSON", () => {
    const buffer = [
      JSON.stringify({ type: "agent.tools.started" }),
      JSON.stringify({ arguments: { path: "src/app.ts" }, id: "read-app", name: "workspace.read_file", type: "agent.tool.requested" }),
      JSON.stringify({ name: "workspace.list_directory", ok: true, output: "dir src", type: "agent.tool.completed" }),
      JSON.stringify({ name: "rag.retrieve_context", ok: false, output: "Code index is missing.", type: "agent.tool.completed" })
    ].join("\n");

    expect(parseAgentOutput(buffer, "subagent")).toBe("");
  });

  it("extracts assistant messages after native tool events", () => {
    const buffer = [
      JSON.stringify({ type: "agent.tools.started" }),
      JSON.stringify({ message: "修好了", type: "agent.message" })
    ].join("\n");

    expect(parseAgentOutput(buffer, "subagent")).toBe("修好了");
  });
});

describe("streaming agent output display", () => {
  it("keeps native tool events out of assistant message content while streaming", () => {
    const buffer = [
      JSON.stringify({ kind: "subagent", model: "gpt-5", type: "agent.started" }),
      JSON.stringify({ type: "agent.tools.started" }),
      JSON.stringify({ name: "workspace.list_directory", ok: true, output: "dir src", type: "agent.tool.completed" })
    ].join("\n");

    expect(getStreamingAgentOutput(buffer, "subagent")).toEqual({ content: "", shouldRender: false });
  });

  it("uses a clean final fallback instead of raw JSON when no assistant text arrives", () => {
    const buffer = JSON.stringify({ type: "agent.tools.started" });

    expect(getFinalAgentOutput(buffer, "subagent")).toBe("无响应");
  });
});
