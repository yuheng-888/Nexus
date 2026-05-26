import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  SearchMatch,
  SearchReplaceApplyResult,
  SearchReplaceFilePreview,
  SearchReplacePreviewResult,
  SearchReplaceRequest,
  SearchRequest
} from "../contracts.js";
import { resolveWorkspacePath, toWorkspaceRelativePath } from "./pathGuards.js";

export interface SearchServiceOptions {
  readonly workspaceRoot: string | null;
}

interface ProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

const MAX_PREVIEW_LINES_PER_FILE = 20;

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

  async previewReplace(request: SearchReplaceRequest): Promise<SearchReplacePreviewResult> {
    const input = normalizeReplaceRequest(request, this.workspaceRoot);
    const files = await this.resolveReplaceFiles(input);
    const previews = await Promise.all(files.map((path) => previewReplaceFile(path, input)));
    return summarizePreview(previews.filter((file) => file.matches > 0));
  }

  async applyReplace(request: SearchReplaceRequest): Promise<SearchReplaceApplyResult> {
    const input = normalizeReplaceRequest(request, this.workspaceRoot);
    const files = await this.resolveReplaceFiles(input);
    const changed = await Promise.all(files.map((path) => applyReplaceFile(path, input)));
    return summarizeApply(changed.filter((file) => file.matches > 0));
  }

  private async resolveReplaceFiles(input: ReplaceInput): Promise<readonly string[]> {
    if (input.paths !== undefined) return input.paths.map((path) => resolveWorkspacePath(input.workspaceRoot, path));
    return findLiteralMatchFiles(input);
  }
}

interface ReplaceInput {
  readonly cwd: string;
  readonly paths?: readonly string[];
  readonly query: string;
  readonly replacement: string;
  readonly workspaceRoot: string;
}

interface ReplaceApplyFileResult {
  readonly matches: number;
  readonly path: string;
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

function normalizeReplaceRequest(request: SearchReplaceRequest, root: string | null): ReplaceInput {
  const query = readString(request.query, "Search query is required for replace").trim();
  if (query === "") throw new Error("Search query is required for replace");
  const workspaceRoot = requireWorkspaceRoot(root);
  return {
    cwd: resolveWorkspacePath(workspaceRoot, request.cwd ?? "."),
    paths: readOptionalPaths(request.paths),
    query,
    replacement: readString(request.replacement, "Replacement text is required"),
    workspaceRoot
  };
}

async function findLiteralMatchFiles(input: ReplaceInput): Promise<readonly string[]> {
  const result = await runProcess("rg", ["--files-with-matches", "--fixed-strings", "--", input.query, input.cwd], input.workspaceRoot);
  if (result.exitCode === 1) return [];
  assertSuccessfulSearch(result);
  return result.stdout.split(/\r?\n/).filter(Boolean).map((path) => resolve(input.workspaceRoot, path));
}

async function previewReplaceFile(path: string, input: ReplaceInput): Promise<SearchReplaceFilePreview> {
  const content = await readFile(path, "utf8");
  const relativePath = toWorkspaceRelativePath(input.workspaceRoot, path);
  return {
    matches: countLiteralOccurrences(content, input.query),
    path: relativePath,
    previews: previewReplaceLines(content, input)
  };
}

async function applyReplaceFile(path: string, input: ReplaceInput): Promise<ReplaceApplyFileResult> {
  const content = await readFile(path, "utf8");
  const matches = countLiteralOccurrences(content, input.query);
  if (matches > 0) await writeFile(path, replaceLiteral(content, input.query, input.replacement), "utf8");
  return { matches, path: toWorkspaceRelativePath(input.workspaceRoot, path) };
}

function previewReplaceLines(content: string, input: ReplaceInput): SearchReplaceFilePreview["previews"] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    if (!line.includes(input.query)) return [];
    return [{
      after: replaceLiteral(line, input.query, input.replacement),
      before: line,
      line: index + 1
    }];
  }).slice(0, MAX_PREVIEW_LINES_PER_FILE);
}

function summarizePreview(files: readonly SearchReplaceFilePreview[]): SearchReplacePreviewResult {
  return {
    files,
    totalMatches: files.reduce((total, file) => total + file.matches, 0)
  };
}

function summarizeApply(files: readonly ReplaceApplyFileResult[]): SearchReplaceApplyResult {
  return {
    filesChanged: files.length,
    paths: files.map((file) => file.path),
    totalMatches: files.reduce((total, file) => total + file.matches, 0)
  };
}

function countLiteralOccurrences(value: string, query: string): number {
  let count = 0;
  let index = value.indexOf(query);
  while (index !== -1) {
    count += 1;
    index = value.indexOf(query, index + query.length);
  }
  return count;
}

function replaceLiteral(value: string, query: string, replacement: string): string {
  return value.split(query).join(replacement);
}

function readString(value: unknown, message: string): string {
  if (typeof value !== "string") throw new Error(message);
  return value;
}

function readOptionalPaths(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Replace paths must be strings");
  }
  return value;
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
