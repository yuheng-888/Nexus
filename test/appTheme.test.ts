import { describe, expect, it } from "vitest";
import { applyThemePreference, getMonacoTheme, loadThemePreference, resolveThemeId } from "../frontend/src/theme/appTheme.js";

describe("appTheme", () => {
  it("falls back to the existing Nexus theme for unknown values", () => {
    expect(resolveThemeId("sepia")).toBe("nexus");
    expect(resolveThemeId(null)).toBe("nexus");
  });

  it("maps pure white to the light Monaco theme", () => {
    expect(getMonacoTheme("pure-white")).toBe("vs");
    expect(getMonacoTheme("pure-black")).toBe("vs-dark");
  });

  it("loads and applies persisted theme preferences", () => {
    const target = fakeThemeTarget("pure-black");

    expect(loadThemePreference(target)).toBe("pure-black");

    const applied = applyThemePreference("pure-white", target);

    expect(applied).toBe("pure-white");
    expect(target.attributes["data-theme"]).toBe("pure-white");
    expect(target.values["nexus-theme"]).toBe("pure-white");
  });
});

function fakeThemeTarget(initial: string) {
  const values: Record<string, string> = { "nexus-theme": initial };
  const attributes: Record<string, string> = {};

  return {
    attributes,
    getItem: (key: string) => values[key] ?? null,
    setAttribute: (key: string, value: string) => {
      attributes[key] = value;
    },
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
    values
  };
}
