import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NativeAgentMcpToolProvider } from "../src/main/agentMcpTools.js";
import { McpService } from "../src/main/mcpService.js";

let configDir = "";

afterEach(async () => {
  if (configDir === "") return;
  await rm(configDir, { force: true, recursive: true });
  configDir = "";
});

describe("NativeAgentMcpToolProvider marketplace tools", () => {
  it("formats MCP marketplace search and install results", async () => {
    configDir = await mkdtemp(join(tmpdir(), "nexus-agent-mcp-"));
    const service = new McpService({ configPath: join(configDir, "mcp.json"), fetch: mcpSoFetch });
    const provider = new NativeAgentMcpToolProvider({ service });

    const search = await provider.searchMarketplace({ query: "chrome", source: "mcp.so" });
    const preview = await provider.previewInstallMarketplaceServer({ id: "mcp.so:crawlio-browser" });
    const install = await provider.installMarketplaceServer({ id: "mcp.so:crawlio-browser" });

    expect(search).toContain("mcp.so:crawlio-browser [mcp.so]");
    expect(search).toContain("installable: true");
    expect(preview).toBe("Install MCP marketplace server: mcp.so:crawlio-browser");
    expect(install).toContain("success: true");
    expect(install).toContain("crawlio-browser");
  });
});

async function mcpSoFetch(url: string | URL | Request): Promise<Response> {
  expect(String(url)).toContain("mcp.so/search.html");

  return new Response([
    '<script>self.__next_f.push([1,"',
    '\\"projects\\":[{\\"id\\":18798,\\"uuid\\":\\"search-id\\",',
    '\\"name\\":\\"crawlio-browser\\",\\"title\\":\\"Crawlio Browser\\",',
    '\\"description\\":\\"Chrome automation for AI agents via MCP.\\",',
    '\\"author_name\\":\\"Crawlio-app\\",\\"category\\":\\"browser-automation\\",',
    '\\"type\\":\\"server\\",\\"url\\":\\"https://github.com/Crawlio-app/crawlio-browser-agent\\",',
    '\\"server_config\\":\\"{\\\\\\"mcpServers\\\\\\":{\\\\\\"crawlio-browser\\\\\\":{',
    '\\\\\\"command\\\\\\":\\\\\\"npx\\\\\\",\\\\\\"args\\\\\\":[\\\\\\"-y\\\\\\",',
    '\\\\\\"crawlio-browser\\\\\\"]}}}\\"}]',
    '"])</script>'
  ].join(""));
}
