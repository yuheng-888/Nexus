import { describe, expect, it } from "vitest";
import { createWakeReply, includesWakeWord, normalizeWakeTranscript, WAKE_WORD } from "../frontend/src/components/ai/voiceWake.js";

describe("voiceWake", () => {
  it("normalizes Chinese wake transcripts before matching", () => {
    expect(normalizeWakeTranscript("天 枢。")).toBe(WAKE_WORD);
  });

  it("detects the wake word inside recognition text", () => {
    expect(includesWakeWord("你好，天枢，打开助手")).toBe(true);
    expect(includesWakeWord("天气不错")).toBe(false);
  });

  it("creates the wake reply spoken by Nexus", () => {
    expect(createWakeReply()).toBe("我在，已唤醒 Nexus 语音助手。");
  });
});
