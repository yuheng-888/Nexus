import { spawn } from "node:child_process";
import type { GitCommandResult } from "../gitContracts.js";

export function runGit(args: readonly string[], cwd: string): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = spawn("git", [...args], { cwd });
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
