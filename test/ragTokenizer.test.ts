import { describe, expect, it } from "vitest";
import { tokenizeForRag } from "../src/main/ragTokenizer.js";

describe("tokenizeForRag", () => {
  it("splits natural language, paths, camelCase, and snake_case into searchable tokens", () => {
    const tokens = tokenizeForRag("src/main/apiConfigStore.ts saves custom_responsePath for getHTTPClient");

    expect(tokens).toEqual(expect.arrayContaining([
      "api",
      "config",
      "custom",
      "http",
      "main",
      "path",
      "response",
      "saves",
      "src",
      "store"
    ]));
  });

  it("deduplicates and drops short noisy tokens", () => {
    expect(tokenizeForRag("to to a AI ai use use")).toEqual(["use"]);
  });
});
