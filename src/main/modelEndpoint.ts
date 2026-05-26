const CHAT_COMPLETIONS_PATH = "/chat/completions";
const CHAT_COMPLETIONS_PATTERN = /\/chat\/completions\/?$/i;

export function openAiChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed === "") throw new Error("Base URL 未设置");
  if (CHAT_COMPLETIONS_PATTERN.test(trimmed)) return trimmed;
  return `${trimmed}${CHAT_COMPLETIONS_PATH}`;
}
