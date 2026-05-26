import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { McpServer } from "../contracts.js";

export interface McpRuntimeTool {
  readonly description?: string;
  readonly name: string;
}

export interface McpRuntimeClient {
  callTool(server: McpServer, toolName: string, args: Record<string, unknown>): Promise<string>;
  listTools(server: McpServer): Promise<readonly McpRuntimeTool[]>;
}

interface JsonRpcMessage {
  readonly error?: { readonly message?: string };
  readonly id?: number;
  readonly result?: unknown;
}

const MCP_PROTOCOL_VERSION = "2024-11-05";

export class McpStdioRuntimeClient implements McpRuntimeClient {
  async listTools(server: McpServer): Promise<readonly McpRuntimeTool[]> {
    return this.withSession(server, async (session) => {
      const result = await session.request("tools/list", {});
      return readTools(result);
    });
  }

  async callTool(server: McpServer, toolName: string, args: Record<string, unknown>): Promise<string> {
    return this.withSession(server, async (session) => {
      const result = await session.request("tools/call", { arguments: args, name: toolName });
      return formatToolCallResult(result);
    });
  }

  private async withSession<T>(server: McpServer, run: (session: McpStdioSession) => Promise<T>): Promise<T> {
    if (server.type !== "stdio" || server.command === undefined) {
      throw new Error(`MCP server ${server.name} is not a stdio server.`);
    }

    const session = new McpStdioSession(server);
    try {
      await session.initialize();
      return await run(session);
    } finally {
      session.close();
    }
  }
}

class McpStdioSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private readonly pending = new Map<number, (message: JsonRpcMessage) => void>();
  private stdoutBuffer = "";

  constructor(server: McpServer) {
    this.child = spawn(server.command ?? "", [...server.args], {
      env: { ...process.env, ...server.env },
      stdio: "pipe"
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.handleStdout(chunk));
    this.child.on("error", (error) => this.rejectAll(error));
    this.child.on("exit", () => this.rejectAll(new Error(`MCP server exited: ${server.name}`)));
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      capabilities: {},
      clientInfo: { name: "Nexus", version: "0.1.0" },
      protocolVersion: MCP_PROTOCOL_VERSION
    });
    this.notify("notifications/initialized", {});
  }

  request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;
    this.write({ id, jsonrpc: "2.0", method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, (message) => {
        if (message.error !== undefined) reject(new Error(message.error.message ?? `${method} failed`));
        else resolve(message.result);
      });
    });
  }

  notify(method: string, params: Record<string, unknown>): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  close(): void {
    this.child.kill();
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) this.handleMessage(JSON.parse(line) as JsonRpcMessage);
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (message.id === undefined) return;
    const handler = this.pending.get(message.id);
    if (handler === undefined) return;
    this.pending.delete(message.id);
    handler(message);
  }

  private rejectAll(error: Error): void {
    for (const handler of this.pending.values()) handler({ error: { message: error.message } });
    this.pending.clear();
  }

  private write(message: Record<string, unknown>): void {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }
}

function readTools(result: unknown): readonly McpRuntimeTool[] {
  if (!isRecord(result) || !Array.isArray(result.tools)) return [];
  return result.tools.flatMap(readTool);
}

function readTool(value: unknown): readonly McpRuntimeTool[] {
  if (!isRecord(value) || typeof value.name !== "string") return [];
  return [{ description: typeof value.description === "string" ? value.description : undefined, name: value.name }];
}

function formatToolCallResult(result: unknown): string {
  if (!isRecord(result) || !Array.isArray(result.content)) return JSON.stringify(result);
  return result.content.map(formatContentItem).join("\n");
}

function formatContentItem(value: unknown): string {
  if (!isRecord(value)) return "";
  if (typeof value.text === "string") return value.text;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
