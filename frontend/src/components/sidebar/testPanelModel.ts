import type { TestFile, TestRunResult } from "../../types/test";

export function formatTestFileMeta(file: TestFile): string {
  return `${file.framework} · ${file.path}`;
}

export function formatTestRunSummary(result: TestRunResult): string {
  const status = result.passed ? "通过" : `失败(${result.exitCode})`;
  return `${status} · ${formatDuration(result.durationMs)} · ${result.command}`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
