export const WAKE_WORD = "天枢";
export const WAKE_REPLY = "我在，已唤醒 Nexus 语音助手。";

export function normalizeWakeTranscript(transcript: string): string {
  return transcript
    .normalize("NFKC")
    .replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, "")
    .toLowerCase();
}

export function includesWakeWord(transcript: string): boolean {
  return normalizeWakeTranscript(transcript).includes(WAKE_WORD);
}

export function createWakeReply(): string {
  return WAKE_REPLY;
}
