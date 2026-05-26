import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { TestDiscoveryResult, TestFile, TestRunRequest, TestRunResult } from "../testContracts.js";

export interface TestProcessRequest {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}

export interface TestProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type TestProcessRunner = (request: TestProcessRequest) => Promise<TestProcessResult>;

export interface TestServiceOptions {
  readonly runner?: TestProcessRunner;
  readonly workspaceRoot: string | null;
}

interface PackageJson {
  readonly scripts?: Record<string, unknown>;
}

const TEST_FILE_GLOBS = [
  "*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}",
  "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}",
  "!node_modules/**",
  "!dist/**",
  "!dist-packaged/**",
  "!vendor/**"
];

export class TestService {
  private readonly runner: TestProcessRunner;
  private workspaceRoot: string | null;

  constructor(options: TestServiceOptions) {
    this.runner = options.runner ?? runProcess;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async discover(): Promise<TestDiscoveryResult> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    await requireNpmTestScript(workspaceRoot);
    return {
      command: "npm test",
      files: await discoverTestFiles(workspaceRoot, this.runner),
      runner: "npm"
    };
  }

  async run(request: TestRunRequest): Promise<TestRunResult> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    await requireNpmTestScript(workspaceRoot);
    const args = buildNpmTestArgs(request);
    const startedAt = Date.now();
    const result = await this.runner({ args, command: "npm", cwd: workspaceRoot });
    return {
      command: ["npm", ...args].join(" "),
      durationMs: Date.now() - startedAt,
      exitCode: result.exitCode,
      passed: result.exitCode === 0,
      stderr: result.stderr,
      stdout: result.stdout
    };
  }
}

async function discoverTestFiles(
  workspaceRoot: string,
  runner: TestProcessRunner
): Promise<readonly TestFile[]> {
  const args = TEST_FILE_GLOBS.flatMap((glob) => ["--glob", glob]);
  const result = await runner({ args: ["--files", ...args], command: "rg", cwd: workspaceRoot });
  if (result.exitCode === 1) return [];
  if (result.exitCode !== 0) throw new Error(`Test discovery failed: ${result.stderr}`);
  return [...uniqueLines(result.stdout)].sort().map(toTestFile);
}

async function requireNpmTestScript(workspaceRoot: string): Promise<void> {
  const pkg = JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")) as PackageJson;
  if (typeof pkg.scripts?.test !== "string" || pkg.scripts.test.trim() === "") {
    throw new Error("package.json must define a test script");
  }
}

function buildNpmTestArgs(request: TestRunRequest): readonly string[] {
  if (request.scope === "all") return ["test"];
  if (request.scope !== "file") throw new Error(`Unsupported test scope: ${request.scope}`);
  if (request.path?.trim() === undefined || request.path.trim() === "") {
    throw new Error("Test file path is required");
  }
  return ["test", "--", request.path.trim()];
}

function toTestFile(path: string): TestFile {
  return {
    framework: inferFramework(path),
    name: basename(path),
    path
  };
}

function inferFramework(path: string): string {
  return path.includes(".test.") || path.includes(".spec.") ? "vitest" : "unknown";
}

function uniqueLines(value: string): readonly string[] {
  return [...new Set(value.split(/\r?\n/).filter(Boolean))];
}

function requireWorkspaceRoot(workspaceRoot: string | null): string {
  if (workspaceRoot === null) throw new Error("No workspace is open");
  return workspaceRoot;
}

function runProcess(request: TestProcessRequest): Promise<TestProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(request.command, [...request.args], { cwd: request.cwd });
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
      resolve({ exitCode: exitCode ?? 0, stderr, stdout });
    });
  });
}
