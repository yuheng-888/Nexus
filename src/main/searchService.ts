import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { SearchMatch, SearchRequest } from "../contracts.js";
import { resolveWorkspacePath, toWorkspaceRelativePath } from "./pathGuards.js";

export interface SearchServiceOptions {
  readonly workspaceRoot: string | null;
}

interface ProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export class SearchService {
  private workspaceRoot: string | null;

  constructor(options: SearchServiceOptions) {
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async search(request: SearchRequest): Promise<readonly SearchMatch[]> {
    const query = request.query.trim();

    if (query === "") {
      return [];
    }

    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const cwd = resolveWorkspacePath(workspaceRoot, request.cwd ?? ".");
    const result = await runProcess("rg", ["--json", query, cwd], workspaceRoot);

    if (result.exitCode === 1) {
      return [];
    }

    assertSuccessfulSearch(result);
    return parseRipgrepJson(result.stdout, workspaceRoot, cwd);
  }
}

function requireWorkspaceRoot(workspaceRoot: string | null): string {
  if (workspaceRoot === null) {
    throw new Error("No workspace is open");
  }

  return workspaceRoot;
}

function assertSuccessfulSearch(result: ProcessResult): void {
  if (result.exitCode !== 0) {
    throw new Error(`ripgrep failed with exit code ${result.exitCode}: ${result.stderr}`);
  }
}

function parseRipgrepJson(stdout: string, workspaceRoot: string, cwd: string): readonly SearchMatch[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => parseRipgrepLine(line, workspaceRoot, cwd));
}

function parseRipgrepLine(line: string, workspaceRoot: string, cwd: string): readonly SearchMatch[] {
  const event = JSON.parse(line) as { type?: string; data?: Record<string, unknown> };

  if (event.type !== "match" || event.data === undefined) {
    return [];
  }

  return [toSearchMatch(event.data, workspaceRoot, cwd)];
}

function toSearchMatch(data: Record<string, unknown>, workspaceRoot: string, cwd: string): SearchMatch {
  const lineNumber = data.line_number;
  const path = data.path as { text?: string };
  const lines = data.lines as { text?: string };
  const absolutePath = resolve(cwd, path.text ?? "");

  return {
    line: typeof lineNumber === "number" ? lineNumber : 0,
    path: toWorkspaceRelativePath(workspaceRoot, absolutePath),
    preview: (lines.text ?? "").trimEnd()
  };
}

function runProcess(command: string, args: readonly string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(command, [...args], { cwd });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolveProcess({ exitCode: exitCode ?? 0, stderr, stdout });
    });
  });
}
