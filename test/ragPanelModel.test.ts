import { describe, expect, it } from "vitest";
import {
  formatRagBuiltAt,
  formatRagResultLocation,
  ragErrorMessage,
  ragStatusText,
  summarizeRagResult,
  type RagPanelStatus
} from "../frontend/src/components/sidebar/ragPanelModel.js";

describe("rag panel model", () => {
  it("shows a no-workspace state before a project is opened", () => {
    const status: RagPanelStatus = {
      indexed: false,
      indexedChunks: 0,
      indexedFiles: 0,
      indexPath: "",
      workspaceRoot: null
    };

    expect(ragStatusText(status)).toBe("尚未打开项目");
  });

  it("shows an explicit missing-index state for an opened project", () => {
    const status: RagPanelStatus = {
      indexed: false,
      indexedChunks: 0,
      indexedFiles: 0,
      indexPath: "/tmp/nexus/index.json",
      workspaceRoot: "/workspace/app"
    };

    expect(ragStatusText(status)).toBe("未构建索引");
  });

  it("summarizes indexed files and chunks", () => {
    const status: RagPanelStatus = {
      builtAt: Date.UTC(2026, 4, 26, 8, 30),
      indexed: true,
      indexedChunks: 128,
      indexedFiles: 24,
      indexPath: "/tmp/nexus/index.json",
      workspaceRoot: "/workspace/app"
    };

    expect(ragStatusText(status)).toBe("已索引 24 个文件 · 128 个片段");
  });

  it("formats build time and search result metadata", () => {
    expect(formatRagBuiltAt(undefined)).toBe("尚未构建");
    expect(formatRagBuiltAt(Date.UTC(2026, 4, 26, 8, 30))).toContain("2026");
    expect(formatRagResultLocation({ endLine: 12, path: "src/main.ts", startLine: 4 })).toBe("src/main.ts:4-12");
  });

  it("builds concise result summaries and error messages", () => {
    expect(summarizeRagResult({ preview: "alpha\nbeta", score: 0.423 })).toBe("alpha beta · score 0.423");
    expect(ragErrorMessage(new Error("Code index is missing"))).toBe("RAG 操作失败: Code index is missing");
    expect(ragErrorMessage("boom")).toBe("RAG 操作失败: boom");
  });
});
