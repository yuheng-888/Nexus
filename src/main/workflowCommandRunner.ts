import { spawn } from "node:child_process";
import type { GitCommandResult } from "../gitContracts.js";

export interface WorkflowCommandRunOptions {
  readonly command: string;
  readonly cwd: string;
  readonly timeoutMs?: number;
}

export interface WorkflowCommandRunner {
  run(options: WorkflowCommandRunOptions): Promise<GitCommandResult>;
}

export class ShellWorkflowCommandRunner implements WorkflowCommandRunner {
  run(options: WorkflowCommandRunOptions): Promise<GitCommandResult> {
    return runShellCommand(options);
  }
}

function runShellCommand(options: WorkflowCommandRunOptions): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(options.command, {
      cwd: options.cwd,
      shell: true,
      timeout: options.timeoutMs
    });
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
    child.on("error", (error) => {
      resolve({ exitCode: -1, stderr: error.message, stdout });
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stderr, stdout });
    });
  });
}
