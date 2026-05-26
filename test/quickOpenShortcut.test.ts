import { describe, expect, it } from "vitest";
import { isQuickOpenShortcut } from "../frontend/src/components/editor/useQuickOpenShortcut.js";

describe("quick open shortcut", () => {
  it("detects command or control P", () => {
    expect(isQuickOpenShortcut({ ctrlKey: false, key: "p", metaKey: true })).toBe(true);
    expect(isQuickOpenShortcut({ ctrlKey: true, key: "P", metaKey: false })).toBe(true);
  });

  it("ignores unrelated key events", () => {
    expect(isQuickOpenShortcut({ ctrlKey: false, key: "p", metaKey: false })).toBe(false);
    expect(isQuickOpenShortcut({ ctrlKey: true, key: "s", metaKey: false })).toBe(false);
  });
});
