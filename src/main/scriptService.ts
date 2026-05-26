import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectScript, ScriptDiscoveryResult, ScriptRunRequest, ScriptRunResult } from "../scriptContracts.js";

export interface ScriptProcessRequest {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}

export interface ScriptProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type ScriptProcessRunner = (request: ScriptProcessRequest) => Promise<ScriptProcessResult>;

export interface ScriptServiceOptions {
  readonly runner?: ScriptProcessRunner;
  readonly workspaceRoot: string | null;
}

interface PackageJson {
  readonly scripts?: Record<string, unknown>;
}

export class ScriptService {
  private readonly runner: ScriptProcessRunner;
  private workspaceRoot: string | null;

  constructor(options: ScriptServiceOptions) {
    this.runner = options.runner ?? runProcess;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async discover(): Promise<ScriptDiscoveryResult> {
    return {
      packageManager: "npm",
      scripts: await readScripts(requireWorkspaceRoot(this.workspaceRoot))
    };
  }

  async run(request: ScriptRunRequest): Promise<ScriptRunResult> {
    const workspaceRoot = requireWorkspaceRoot(this.workspaceRoot);
    const script = await requireScript(workspaceRoot, request.name);
    const startedAt = Date.now();
    const result = await this.runner({ args: ["run", script.name], command: "npm", cwd: workspaceRoot });
    return {
      command: `npm run ${script.name}`,
      durationMs: Date.now() - startedAt,
      exitCode: result.exitCode,
      passed: result.exitCode === 0,
      script,
      stderr: result.stderr,
      stdout: result.stdout
    };
  }
}

async function requireScript(workspaceRoot: string, name: string): Promise<ProjectScript> {
  const scriptName = requireScriptName(name);
  const script = (await readScripts(workspaceRoot)).find((item) => item.name === scriptName);
  if (script === undefined) throw new Error(`Unknown package script: ${scriptName}`);
  return script;
}

async function readScripts(workspaceRoot: string): Promise<readonly ProjectScript[]> {
  const pkg = JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")) as PackageJson;
  return Object.entries(pkg.scripts ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, command]) => ({ command, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function requireScriptName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Script name is required");
  return trimmed;
}

function requireWorkspaceRoot(workspaceRoot: string | null): string {
  if (workspaceRoot === null) throw new Error("No workspace is open");
  return workspaceRoot;
}

function runProcess(request: ScriptProcessRequest): Promise<ScriptProcessResult> {
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
