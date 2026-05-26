import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { McpServer } from "../src/contracts.js";
import { McpStdioRuntimeClient } from "../src/main/mcpStdioRuntimeClient.js";

describe("McpStdioRuntimeClient", () => {
  it("lists and calls tools over stdio JSON-RPC", async () => {
    const server = await createFakeMcpServer();
    const client = new McpStdioRuntimeClient();

    const tools = await client.listTools(server);
    const result = await client.callTool(server, "echo", { text: "hello" });

    expect(tools).toEqual([{ description: "Echo input text.", name: "echo" }]);
    expect(result).toBe("echo:{\"text\":\"hello\"}");
  });
});

async function createFakeMcpServer(): Promise<McpServer> {
  const dir = await mkdtemp(join(tmpdir(), "nexus-fake-mcp-"));
  const script = join(dir, "server.mjs");
  await writeFile(script, fakeMcpServerSource(), "utf8");
  return {
    args: [script],
    command: process.execPath,
    enabled: true,
    env: {},
    name: "fake-mcp",
    source: "manual",
    type: "stdio"
  };
}

function fakeMcpServerSource(): string {
  return [
    "import readline from 'node:readline';",
    "const rl = readline.createInterface({ input: process.stdin });",
    "rl.on('line', (line) => {",
    "  const req = JSON.parse(line);",
    "  if (req.method === 'initialize') reply(req.id, { protocolVersion: '2024-11-05', capabilities: {} });",
    "  if (req.method === 'tools/list') reply(req.id, { tools: [{ name: 'echo', description: 'Echo input text.' }] });",
    "  if (req.method === 'tools/call') reply(req.id, { content: [{ type: 'text', text: `echo:${JSON.stringify(req.params.arguments)}` }] });",
    "});",
    "function reply(id, result) { console.log(JSON.stringify({ jsonrpc: '2.0', id, result })); }"
  ].join("\n");
}
