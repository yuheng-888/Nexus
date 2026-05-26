import { describe, expect, it } from "vitest";
import {
  filterCommandPaletteItems,
  isCommandPaletteShortcut,
  runCommandPaletteItem,
  type CommandPaletteItem
} from "../frontend/src/components/commandPalette/commandPaletteModel.js";

describe("command palette model", () => {
  it("detects command/control shift P", () => {
    expect(isCommandPaletteShortcut({ ctrlKey: false, key: "P", metaKey: true, shiftKey: true })).toBe(true);
    expect(isCommandPaletteShortcut({ ctrlKey: true, key: "p", metaKey: false, shiftKey: true })).toBe(true);
  });

  it("ignores quick open and unrelated shortcuts", () => {
    expect(isCommandPaletteShortcut({ ctrlKey: true, key: "p", metaKey: false, shiftKey: false })).toBe(false);
    expect(isCommandPaletteShortcut({ ctrlKey: false, key: "k", metaKey: true, shiftKey: true })).toBe(false);
  });

  it("filters by title, category, keywords, and shortcut", () => {
    const items = commandItems();

    expect(filterCommandPaletteItems(items, "rag").map((item) => item.id)).toEqual(["rag.build"]);
    expect(filterCommandPaletteItems(items, "git").map((item) => item.id)).toEqual(["git.panel"]);
    expect(filterCommandPaletteItems(items, "cmd shift p").map((item) => item.id)).toEqual(["commands.show"]);
    expect(filterCommandPaletteItems(items, "").map((item) => item.id)).toEqual([
      "files.open",
      "commands.show",
      "rag.build",
      "git.panel"
    ]);
  });

  it("runs the exact command item passed by the row", async () => {
    const calls: string[] = [];
    const items = commandItems(calls);

    await runCommandPaletteItem(items[2]);

    expect(calls).toEqual(["rag.build"]);
  });
});

function commandItems(calls: string[] = []): readonly CommandPaletteItem[] {
  return [
    {
      category: "文件",
      id: "files.open",
      keywords: ["folder", "project"],
      run: () => calls.push("files.open"),
      title: "打开项目"
    },
    {
      category: "视图",
      id: "commands.show",
      keywords: ["command", "palette"],
      run: () => calls.push("commands.show"),
      shortcut: "Cmd Shift P",
      title: "显示命令面板"
    },
    {
      category: "AI",
      id: "rag.build",
      keywords: ["index", "代码库"],
      run: () => calls.push("rag.build"),
      title: "构建代码库索引"
    },
    {
      category: "Git",
      id: "git.panel",
      keywords: ["版本控制"],
      run: () => calls.push("git.panel"),
      title: "打开版本控制"
    }
  ];
}
