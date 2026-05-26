import { describe, expect, it } from "vitest";
import { formatScriptCommand, formatScriptRunSummary } from "../frontend/src/components/sidebar/scriptPanelModel.js";
import type { ProjectScript, ScriptRunResult } from "../frontend/src/types/script.js";

describe("script panel model", () => {
  it("formats scripts and run results", () => {
    expect(formatScriptCommand(script())).toBe("build · tsc -p tsconfig.json");
    expect(formatScriptRunSummary(runResult({ exitCode: 0 }))).toBe("通过 · 1.5s · npm run build");
    expect(formatScriptRunSummary(runResult({ exitCode: 2 }))).toBe("失败(2) · 1.5s · npm run build");
  });
});

function script(): ProjectScript {
  return { command: "tsc -p tsconfig.json", name: "build" };
}

function runResult(overrides: Partial<ScriptRunResult>): ScriptRunResult {
  return {
    command: "npm run build",
    durationMs: 1530,
    exitCode: overrides.exitCode ?? 0,
    passed: overrides.exitCode === undefined || overrides.exitCode === 0,
    script: script(),
    stderr: "",
    stdout: "ok"
  };
}
