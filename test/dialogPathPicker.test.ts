import { describe, expect, it } from "vitest";
import {
  dialogPropertiesForMode,
  shouldUseSaveDialog
} from "../src/main/dialogPathPicker.js";

describe("dialog path picker", () => {
  it("maps picker modes to explicit Electron dialog properties", () => {
    expect(dialogPropertiesForMode("file")).toEqual(["openFile"]);
    expect(dialogPropertiesForMode("directory")).toEqual(["openDirectory"]);
    expect(dialogPropertiesForMode("file-or-directory")).toEqual(["openFile", "openDirectory"]);
  });

  it("uses save dialog only for save-file requests", () => {
    expect(shouldUseSaveDialog("save-file")).toBe(true);
    expect(shouldUseSaveDialog("file")).toBe(false);
    expect(shouldUseSaveDialog("directory")).toBe(false);
  });
});
