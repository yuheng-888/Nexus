import { describe, expect, it } from "vitest";
import { formatTestFileMeta, formatTestRunSummary } from "../frontend/src/components/sidebar/testPanelModel.js";
import type { TestFile, TestRunResult } from "../frontend/src/types/test.js";

describe("test panel model", () => {
  it("formats test files and run summaries", () => {
    expect(formatTestFileMeta(file())).toBe("vitest · src/app.test.ts");
    expect(formatTestRunSummary(result({ exitCode: 0 }))).toBe("通过 · 1.2s · npm test");
    expect(formatTestRunSummary(result({ exitCode: 1 }))).toBe("失败(1) · 1.2s · npm test");
  });
});

function file(): TestFile {
  return { framework: "vitest", name: "app.test.ts", path: "src/app.test.ts" };
}

function result(overrides: Partial<TestRunResult>): TestRunResult {
  return {
    command: "npm test",
    durationMs: 1234,
    exitCode: overrides.exitCode ?? 0,
    passed: overrides.exitCode === undefined || overrides.exitCode === 0,
    stderr: "",
    stdout: "ok"
  };
}
