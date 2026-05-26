import { describe, expect, it } from "vitest";
import {
  asarDiffEntryMeta,
  asarEntryMeta,
  asarDiffSummary,
  asarInspectSummary,
  defaultReverseTargetPath,
  formatBytes,
  isReverseActionDisabled,
  reverseChangeLabel,
  reverseAnalysisSummary,
  reverseErrorMessage,
  reverseFindingEditorLocation,
  reverseFindingLocation,
  reverseSeverityCounts,
  reverseSeverityLabel,
  topAsarDiffEntries,
  topAsarEntries,
  reverseTargetTypeLabel,
  suggestedProjectName
} from "../frontend/src/components/sidebar/reversePanelModel.js";
import type { ReverseAnalysisFinding, ReverseAnalysisResult, ReverseAsarDiffEntry, ReverseAsarEntry, ReverseAsarDiffResult, ReverseAsarInspectResult, ReverseTargetDetection } from "../frontend/src/types/reverse.js";

describe("reverse panel model", () => {
  it("uses the opened workspace as the default target path", () => {
    expect(defaultReverseTargetPath(null)).toBe("");
    expect(defaultReverseTargetPath("/workspace/app")).toBe("/workspace/app");
  });

  it("formats target types and suggested project names", () => {
    const target: ReverseTargetDetection = {
      absolutePath: "/workspace/Nexus/app.asar",
      confidence: 0.95,
      name: "app.asar",
      path: "/workspace/Nexus/app.asar",
      signals: ["asar archive"],
      type: "asar"
    };

    expect(reverseTargetTypeLabel("electron-app")).toBe("Electron 应用");
    expect(reverseTargetTypeLabel("unknown")).toBe("未知目标");
    expect(suggestedProjectName(target, "/fallback/project")).toBe("app.asar");
    expect(suggestedProjectName(null, "/fallback/project")).toBe("project");
  });

  it("summarizes asar inspect and diff results", () => {
    const inspect: ReverseAsarInspectResult = {
      archivePath: "/tmp/app.asar",
      directories: 3,
      entries: [],
      files: 12,
      totalSize: 1536
    };
    const diff: ReverseAsarDiffResult = {
      added: 2,
      afterPath: "/tmp/after.asar",
      beforePath: "/tmp/before.asar",
      entries: [],
      modified: 1,
      removed: 4
    };

    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(asarInspectSummary(null)).toBe("尚未读取 ASAR");
    expect(asarInspectSummary(inspect)).toBe("12 文件 · 3 目录 · 1.5 KB");
    expect(asarDiffSummary(diff)).toBe("新增 2 · 修改 1 · 删除 4");
  });

  it("formats and limits asar entries for compact result lists", () => {
    const entries: readonly ReverseAsarEntry[] = Array.from({ length: 10 }, (_, index) => ({
      name: `file-${index}.js`,
      path: `dist/file-${index}.js`,
      size: index === 0 ? undefined : 2048,
      type: index === 0 ? "directory" : "file"
    }));
    const diffEntries: readonly ReverseAsarDiffEntry[] = [
      { after: entries[1], change: "added", path: "dist/file-1.js" },
      { before: entries[2], change: "removed", path: "dist/file-2.js" },
      { after: entries[3], before: entries[3], change: "modified", path: "dist/file-3.js" }
    ];

    expect(topAsarEntries(entries)).toHaveLength(8);
    expect(asarEntryMeta(entries[0])).toBe("目录");
    expect(asarEntryMeta(entries[1])).toBe("文件 · 2 KB");
    expect(topAsarDiffEntries(diffEntries)).toEqual(diffEntries);
    expect(reverseChangeLabel("added")).toBe("新增");
    expect(reverseChangeLabel("modified")).toBe("修改");
    expect(reverseChangeLabel("removed")).toBe("删除");
    expect(asarDiffEntryMeta(diffEntries[0])).toBe("新增 · 文件 · 2 KB");
  });

  it("summarizes analysis findings by severity", () => {
    const findings: readonly ReverseAnalysisFinding[] = [
      finding("critical"),
      finding("warning"),
      finding("warning"),
      finding("info")
    ];
    const result: ReverseAnalysisResult = {
      dependencies: [{ absolutePath: "/workspace/app/main.js", importKind: "require", line: 3, name: "electron", path: "main.js" }],
      findings,
      scannedFiles: 6,
      skippedFiles: [{ absolutePath: "/workspace/app/dist/app.js", message: "too large", path: "dist/app.js" }],
      targetPath: "/workspace/app"
    };

    expect(reverseSeverityCounts(findings)).toEqual({ critical: 1, info: 1, warning: 2 });
    expect(reverseSeverityLabel("critical")).toBe("严重");
    expect(reverseSeverityLabel("warning")).toBe("警告");
    expect(reverseSeverityLabel("info")).toBe("信息");
    expect(reverseAnalysisSummary(null)).toBe("尚未扫描 JavaScript");
    expect(reverseAnalysisSummary(result)).toBe("扫描 6 文件 · 4 发现 · 1 依赖 · 1 跳过");
    expect(reverseFindingLocation(findings[0])).toBe("main.js:1");
    expect(reverseFindingEditorLocation(findings[0])).toEqual({
      column: 1,
      line: 1,
      path: "/workspace/app/main.js"
    });
  });

  it("keeps action disabling explicit and reports errors", () => {
    expect(isReverseActionDisabled({ action: "", requiredPath: " /target/app " })).toBe(false);
    expect(isReverseActionDisabled({ action: "scan", requiredPath: "/target/app" })).toBe(true);
    expect(isReverseActionDisabled({ action: "", requiredPath: " " })).toBe(true);
    expect(reverseErrorMessage(new Error("missing target"))).toBe("逆向操作失败: missing target");
    expect(reverseErrorMessage("boom")).toBe("逆向操作失败: boom");
  });
});

function finding(severity: ReverseAnalysisFinding["severity"]): ReverseAnalysisFinding {
  return {
    absolutePath: "/workspace/app/main.js",
    line: 1,
    message: "message",
    path: "main.js",
    severity,
    snippet: "code",
    type: "electron-ipc"
  };
}
