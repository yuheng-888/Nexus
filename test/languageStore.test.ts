import { describe, expect, it } from "vitest";
import { useLanguageStore } from "../frontend/src/store/languageStore.js";
import type { EditorProblem } from "../frontend/src/components/editor/languageClient.js";

describe("language store", () => {
  it("keeps problem summary referentially stable between problem updates", () => {
    useLanguageStore.getState().clearLanguageState();

    const initial = useLanguageStore.getState().problemSummary;
    expect(useLanguageStore.getState().problemSummary).toBe(initial);

    useLanguageStore.getState().setProblemsForPath("src/app.ts", [problem("warning")]);
    const next = useLanguageStore.getState().problemSummary;

    expect(next).not.toBe(initial);
    expect(useLanguageStore.getState().problemSummary).toBe(next);
    expect(next).toMatchObject({ total: 1, warnings: 1 });
  });
});

function problem(severity: EditorProblem["severity"]): EditorProblem {
  return {
    message: "issue",
    path: "src/app.ts",
    range: {
      end: { character: 2, line: 1 },
      start: { character: 1, line: 1 }
    },
    severity,
    source: "typescript"
  };
}
