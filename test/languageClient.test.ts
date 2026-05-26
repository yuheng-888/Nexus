import { describe, expect, it } from "vitest";
import {
  compareProblems,
  diagnosticsToProblems,
  languageDiagnosticToMarker,
  summarizeProblems
} from "../frontend/src/components/editor/languageClient.js";
import type { LanguageDiagnostic } from "../frontend/src/types/language.js";

describe("language client mapping", () => {
  it("maps Nexus diagnostics to Monaco markers", () => {
    const marker = languageDiagnosticToMarker(diagnostic("error"));

    expect(marker).toMatchObject({
      endColumn: 11,
      endLineNumber: 2,
      message: "Type mismatch",
      severity: 8,
      source: "typescript",
      startColumn: 4,
      startLineNumber: 2
    });
  });

  it("summarizes diagnostics by severity", () => {
    const summary = summarizeProblems([
      diagnostic("error"),
      diagnostic("warning"),
      diagnostic("hint"),
      diagnostic("information")
    ]);

    expect(summary).toEqual({
      errors: 1,
      hints: 1,
      information: 1,
      total: 4,
      warnings: 1
    });
  });

  it("attaches file paths to diagnostics for the problems panel", () => {
    const problems = diagnosticsToProblems("src/app.ts", [diagnostic("error")]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      message: "Type mismatch",
      path: "src/app.ts"
    });
  });

  it("sorts problems by file and position", () => {
    const right = { ...diagnostic("warning"), path: "b.ts" };
    const left = { ...diagnostic("error"), path: "a.ts" };

    expect([right, left].sort(compareProblems).map((item) => item.path)).toEqual(["a.ts", "b.ts"]);
  });
});

function diagnostic(severity: LanguageDiagnostic["severity"]): LanguageDiagnostic & { readonly path: string } {
  return {
    code: 2322,
    message: "Type mismatch",
    path: "src/index.ts",
    range: {
      end: { character: 11, line: 2 },
      start: { character: 4, line: 2 }
    },
    severity,
    source: "typescript"
  };
}
