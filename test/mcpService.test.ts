import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { McpService } from "../src/main/mcpService.js";

let configDir = "";

afterEach(async () => {
  if (configDir !== "") {
    await rm(configDir, { force: true, recursive: true });
    configDir = "";
  }
});

describe("McpService", () => {
  it("loads chrome-mcp as the default installed MCP service", async () => {
    const service = new McpService({ configPath: "/tmp/nexus-missing-mcp.json" });

    const servers = await service.listServers();

    expect(servers[0]).toMatchObject({
      args: ["-y", "chrome-mcp@latest"],
      command: "npx",
      enabled: true,
      name: "chrome-mcp",
      source: "builtin"
    });
  });

  it("searches MCP.so and installs a server config", async () => {
    configDir = await mkdtemp(join(tmpdir(), "nexus-mcp-"));
    const configPath = join(configDir, "mcp-servers.json");
    const service = new McpService({ configPath, fetch: mcpSoFetch });

    const listings = await service.searchMarketplace({ query: "chrome", source: "mcp.so" });
    const result = await service.installMarketplaceServer("mcp.so:crawlio-browser");
    const persisted = JSON.parse(await readFile(configPath, "utf8"));

    expect(listings[0]).toMatchObject({
      command: "npx",
      id: "mcp.so:crawlio-browser",
      installable: true,
      name: "Crawlio Browser",
      source: "mcp.so"
    });
    expect(result).toMatchObject({ success: true });
    expect(persisted.servers).toContainEqual(expect.objectContaining({
      args: ["-y", "crawlio-browser"],
      command: "npx",
      enabled: true,
      name: "crawlio-browser",
      source: "mcp.so"
    }));
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
