import { describe, expect, it } from "vitest";
import {
  flattenDocumentSymbols,
  isAbsoluteEditorPath,
  problemToEditorLocation,
  symbolToEditorLocation
} from "../frontend/src/components/editor/editorNavigation.js";
import type { EditorProblem } from "../frontend/src/components/editor/languageClient.js";
import type { LanguageDocumentSymbol } from "../frontend/src/types/language.js";

describe("editor navigation helpers", () => {
  it("uses the diagnostic start position as the editor target", () => {
    expect(problemToEditorLocation(problem())).toEqual({
      column: 7,
      line: 3,
      path: "src/app.ts"
    });
  });

  it("uses the symbol selection start position as the editor target", () => {
    expect(symbolToEditorLocation("src/app.ts", symbol("run", 12, 5))).toEqual({
      column: 5,
      line: 12,
      path: "src/app.ts"
    });
  });

  it("detects local absolute editor paths", () => {
    expect(isAbsoluteEditorPath("/workspace/app.js")).toBe(true);
    expect(isAbsoluteEditorPath("C:\\workspace\\app.js")).toBe(true);
    expect(isAbsoluteEditorPath("src/app.ts")).toBe(false);
  });

  it("flattens nested document symbols with stable depth metadata", () => {
    const outline = flattenDocumentSymbols([
      {
        ...symbol("App", 1, 1),
        children: [
          symbol("render", 3, 3),
          {
            ...symbol("state", 8, 3),
            children: [symbol("count", 9, 5)]
          }
        ]
      }
    ]);

    expect(outline.map((item) => [item.depth, item.symbol.name])).toEqual([
      [0, "App"],
      [1, "render"],
      [1, "state"],
      [2, "count"]
    ]);
    expect(outline.map((item) => item.id)).toEqual([
      "0:App:1:1",
      "0.0:render:3:3",
      "0.1:state:8:3",
      "0.1.0:count:9:5"
    ]);
  });
});

function problem(): EditorProblem {
  return {
    message: "Type mismatch",
    path: "src/app.ts",
    range: {
      end: { character: 11, line: 3 },
      start: { character: 7, line: 3 }
    },
    severity: "error",
    source: "typescript"
  };
}

function symbol(name: string, line: number, character: number): LanguageDocumentSymbol {
  return {
    kind: "function",
    name,
    range: {
      end: { character: character + 3, line },
      start: { character, line }
    },
    selectionRange: {
      end: { character: character + 3, line },
      start: { character, line }
    }
  };
}
