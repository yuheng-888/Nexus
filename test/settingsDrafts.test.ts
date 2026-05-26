import { describe, expect, it, vi } from "vitest";
import type { ApiConfig } from "../frontend/src/types/nexus.js";
import { ApiConfigDraftSaver, applyConfigDraft } from "../frontend/src/components/sidebar/settingsDrafts.js";

describe("settingsDrafts", () => {
  it("updates the visible config draft without mutating the source list", () => {
    const configs = [apiConfig({ id: "one", model: "claude" }), apiConfig({ id: "two" })];

    const next = applyConfigDraft(configs, "one", { model: "claude-opus" });

    expect(next[0]?.model).toBe("claude-opus");
    expect(configs[0]?.model).toBe("claude");
    expect(next[1]).toBe(configs[1]);
  });

  it("debounces backend saves and merges rapid field edits", async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => apiConfig({ id: "one" }));
    const errors: string[] = [];
    const saver = new ApiConfigDraftSaver({
      delayMs: 300,
      onError: (error) => errors.push(error.message),
      update
    });

    saver.schedule("one", { model: "c" });
    saver.schedule("one", { baseUrl: "https://nexus.local" });
    await vi.advanceTimersByTimeAsync(299);

    expect(update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("one", {
      baseUrl: "https://nexus.local",
      model: "c"
    });
    expect(errors).toEqual([]);
    vi.useRealTimers();
  });

  it("flushes pending edits before immediate actions", async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => apiConfig({ id: "one" }));
    const saver = new ApiConfigDraftSaver({ delayMs: 300, onError: () => {}, update });

    saver.schedule("one", { model: "claude" });
    await saver.flush("one");

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("one", { model: "claude" });
    vi.useRealTimers();
  });
});

function apiConfig(overrides: Partial<ApiConfig> = {}): ApiConfig {
  return {
    apiKey: "",
    baseUrl: "https://api.example.test",
    enabled: true,
    id: "config",
    maxTokens: 4096,
    model: "model",
    name: "Config",
    provider: "custom",
    temperature: 0.7,
    ...overrides
  };
}
