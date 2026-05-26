import type { ProjectScript, ScriptRunResult } from "../../types/script";

export function formatScriptCommand(script: ProjectScript): string {
  return `${script.name} · ${script.command}`;
}

export function formatScriptRunSummary(result: ScriptRunResult): string {
  const status = result.passed ? "通过" : `失败(${result.exitCode})`;
  return `${status} · ${formatDuration(result.durationMs)} · ${result.command}`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
