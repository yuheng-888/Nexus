import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiConfig } from "../src/contracts.js";
import { HttpAgentModelClient } from "../src/main/agentModelClient.js";

describe("HttpAgentModelClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports non-JSON model responses with HTTP evidence", async () => {
    vi.stubGlobal("fetch", async () => new Response("<!doctype html><html></html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 200
    }));

    await expect(new HttpAgentModelClient().complete({
      config: openAiConfig(),
      messages: [{ content: "你好", role: "user" }]
    })).rejects.toThrow(/Model response is not valid JSON.*HTTP 200.*text\/html.*<!doctype/s);
  });

  it("supports custom response paths with array indexes", async () => {
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: string; model: string };

      expect(body.input).toContain("quote: \"hello\"");
      expect(body.model).toBe("gpt-5.5");

      return new Response(JSON.stringify({
        data: { choices: [{ message: { content: "custom ok" } }] }
      }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    });

    const response = await new HttpAgentModelClient().complete({
      config: customConfig(),
      messages: [{ content: "quote: \"hello\"", role: "user" }]
    });

    expect(response.text).toBe("custom ok");
  });

  it("uses chat completions for OpenAI-compatible custom configs", async () => {
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      expect(String(url)).toBe("https://nexus.ysys.chat/v1/chat/completions");
      return new Response(JSON.stringify({
        choices: [{ message: { content: "gateway ok" } }]
      }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    });

    const response = await new HttpAgentModelClient().complete({
      config: {
        ...customConfig(),
        baseUrl: "https://nexus.ysys.chat/v1",
        customBodyTemplate: undefined,
        customResponsePath: undefined
      },
      messages: [{ content: "Hi", role: "user" }]
    });

    expect(response.text).toBe("gateway ok");
  });

  it("sends image attachments with OpenAI-compatible messages", async () => {
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: unknown }> };
      expect(body.messages[0]?.content).toEqual([
        { text: "看图", type: "text" },
        { image_url: { url: "data:image/png;base64,aGVsbG8=" }, type: "image_url" }
      ]);
      return okOpenAiResponse();
    });

    const response = await new HttpAgentModelClient().complete({
      config: openAiConfig(),
      messages: [imageMessage()]
    });

    expect(response.text).toBe("ok");
  });

  it("sends image attachments with Anthropic messages", async () => {
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: unknown }> };
      expect(body.messages[0]?.content).toEqual([
        { source: { data: "aGVsbG8=", media_type: "image/png", type: "base64" }, type: "image" },
        { text: "看图", type: "text" }
      ]);
      return new Response(JSON.stringify({ content: [{ text: "ok" }] }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    });

    const response = await new HttpAgentModelClient().complete({
      config: { ...openAiConfig(), baseUrl: "https://api.anthropic.test", provider: "anthropic" },
      messages: [imageMessage()]
    });

    expect(response.text).toBe("ok");
  });
});

function imageMessage() {
  return {
    attachments: [{ dataUrl: "data:image/png;base64,aGVsbG8=", mimeType: "image/png", name: "demo.png" }],
    content: "看图",
    role: "user" as const
  };
}

function okOpenAiResponse(): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: "ok" } }]
  }), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

function openAiConfig(): ApiConfig {
  return {
    apiKey: "test-key",
    baseUrl: "https://api.example.test/v1",
    enabled: true,
    id: "openai",
    maxTokens: 1024,
    model: "gpt-4o",
    name: "OpenAI",
    provider: "openai",
    temperature: 0.2
  };
}

function customConfig(): ApiConfig {
  return {
    ...openAiConfig(),
    baseUrl: "https://nexus.ysys.chat/",
    customBodyTemplate: "{\"model\":\"{{model}}\",\"input\":\"{{prompt}}\"}",
    customMethod: "POST",
    customResponsePath: "data.choices[0].message.content",
    id: "custom",
    model: "gpt-5.5",
    name: "自定义协议",
    provider: "custom"
  };
}
