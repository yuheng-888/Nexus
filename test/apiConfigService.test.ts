import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiConfigService } from "../src/main/apiConfigService.js";

let root = "";

describe("ApiConfigService", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "nexus-api-config-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the updated config after updateConfig", () => {
    const service = createService("update.json");

    const updated = service.updateConfig("openai-default", { model: "gpt-4o-mini" });

    expect(updated?.model).toBe("gpt-4o-mini");
  });

  it("does not report unauthorized OpenAI-compatible responses as successful", async () => {
    const service = createService("unauthorized.json");
    service.updateConfig("openai-default", { apiKey: "test-key" });
    vi.stubGlobal("fetch", async () => new Response("unauthorized", { status: 401 }));

    const result = await service.testConnection("openai-default");

    expect(result.success).toBe(false);
    expect(result.message).toContain("HTTP 401");
  });

  it("does not report HTML custom responses as successful", async () => {
    const service = createService("html.json");
    const config = service.addConfig({
      apiKey: "test-key",
      baseUrl: "https://nexus.ysys.chat/",
      customBodyTemplate: "{\"model\":\"{{model}}\",\"input\":\"{{prompt}}\"}",
      customMethod: "POST",
      customResponsePath: "data.choices[0].message.content",
      enabled: true,
      maxTokens: 1024,
      model: "gpt-5.5",
      name: "自定义协议",
      provider: "custom",
      temperature: 0.2
    });
    vi.stubGlobal("fetch", async () => new Response("<!doctype html><html></html>", {
      headers: { "content-type": "text/html" },
      status: 200
    }));

    const result = await service.testConnection(config.id);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not valid JSON.*HTTP 200.*text\/html/s);
  });

  it("tests OpenAI-compatible custom configs against chat completions", async () => {
    const service = createService("custom-openai-url.json");
    const config = service.addConfig({
      apiKey: "test-key",
      baseUrl: "https://nexus.ysys.chat/v1",
      customMethod: "POST",
      enabled: true,
      maxTokens: 1024,
      model: "gpt-5.5",
      name: "自定义协议",
      provider: "custom",
      temperature: 0.2
    });
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      expect(String(url)).toBe("https://nexus.ysys.chat/v1/chat/completions");
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    });

    const result = await service.testConnection(config.id);

    expect(result.success).toBe(true);
  });

  it("persists added, updated, removed, and active model configs", () => {
    const storePath = join(root, "api-configs.json");
    const service = new ApiConfigService({ storePath });
    const custom = service.addConfig({
      apiKey: "sk-user-key",
      baseUrl: "https://nexus.ysys.chat/api",
      customBodyTemplate: "{\"model\":\"{{model}}\",\"input\":\"{{prompt}}\"}",
      customMethod: "POST",
      customResponsePath: "data.choices[0].message.content",
      enabled: true,
      maxTokens: 2048,
      model: "gpt-5.5",
      name: "Nexus Custom",
      provider: "custom",
      temperature: 0.3
    });

    service.updateConfig(custom.id, { model: "gpt-5.5-latest", temperature: 0.1 });
    service.removeConfig("openai-default");
    service.setActive(custom.id);

    const restored = new ApiConfigService({ storePath });
    const state = restored.getConfigs();

    expect(state.activeId).toBe(custom.id);
    expect(state.configs.map((config) => config.id)).not.toContain("openai-default");
    expect(state.configs.find((config) => config.id === custom.id)).toMatchObject({
      apiKey: "sk-user-key",
      baseUrl: "https://nexus.ysys.chat/api",
      model: "gpt-5.5-latest",
      temperature: 0.1
    });
  });

  it("persists deletion of every config instead of restoring defaults", () => {
    const storePath = join(root, "api-configs-empty.json");
    const service = new ApiConfigService({ storePath });

    for (const config of service.getConfigs().configs) {
      service.removeConfig(config.id);
    }

    const restored = new ApiConfigService({ storePath });

    expect(restored.getConfigs()).toEqual({ activeId: null, configs: [] });
  });
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

function createService(filename: string): ApiConfigService {
  return new ApiConfigService({ storePath: join(root, filename) });
}
