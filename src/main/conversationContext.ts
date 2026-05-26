import type { Conversation, ConversationMessage } from "../contracts.js";
import type { AgentModelMessage } from "./agentModelClient.js";

const CHARS_PER_TOKEN = 4;
const MESSAGE_TOKEN_OVERHEAD = 8;
const SUMMARY_TOKEN_LIMIT = 1200;
const RECENT_MESSAGE_COUNT = 6;
const COMPACTION_TRIGGER_RATIO = 0.85;

export interface ConversationContextInput {
  readonly contextTokenLimit: number;
  readonly conversation: Conversation;
  readonly modelPrompt: string;
  readonly systemPrompt: string;
}

export interface ConversationContextResult {
  readonly compacted: boolean;
  readonly conversation: Conversation;
  readonly estimatedTokens: number;
  readonly messages: readonly AgentModelMessage[];
}

export function prepareConversationContext(input: ConversationContextInput): ConversationContextResult {
  const prepared = compactIfNeeded(input.conversation, input.systemPrompt, input.contextTokenLimit);
  return {
    ...prepared,
    messages: replaceLatestUserPrompt(toModelMessages(input.systemPrompt, prepared.conversation), input.modelPrompt)
  };
}

export function refreshConversationContext(conversation: Conversation): Conversation {
  return {
    ...conversation,
    context: {
      ...conversation.context,
      estimatedTokens: estimateContextTokens("", conversation)
    }
  };
}

function compactIfNeeded(
  conversation: Conversation,
  systemPrompt: string,
  contextTokenLimit: number
): Omit<ConversationContextResult, "messages"> {
  const estimated = estimateContextTokens(systemPrompt, conversation);
  if (estimated <= contextTokenLimit * COMPACTION_TRIGGER_RATIO) {
    return { compacted: false, conversation, estimatedTokens: estimated };
  }

  const compacted = compactConversation(conversation, systemPrompt, contextTokenLimit);
  return {
    compacted: true,
    conversation: compacted,
    estimatedTokens: estimateContextTokens(systemPrompt, compacted)
  };
}

function compactConversation(
  conversation: Conversation,
  systemPrompt: string,
  contextTokenLimit: number
): Conversation {
  const recent = conversation.messages.slice(-RECENT_MESSAGE_COUNT);
  const older = conversation.messages.slice(0, -RECENT_MESSAGE_COUNT);
  const summary = compactSummary(conversation.summary, older);
  const base = refreshConversationContext({ ...conversation, messages: recent, summary });

  return markCompacted(shrinkRecentMessages(base, systemPrompt, contextTokenLimit));
}

function shrinkRecentMessages(
  conversation: Conversation,
  systemPrompt: string,
  contextTokenLimit: number
): Conversation {
  if (conversation.messages.length <= 1) return conversation;
  if (estimateContextTokens(systemPrompt, conversation) <= contextTokenLimit) return conversation;

  const [first, ...rest] = conversation.messages;
  const summary = compactSummary(conversation.summary, [first]);
  return shrinkRecentMessages(refreshConversationContext({ ...conversation, messages: rest, summary }), systemPrompt, contextTokenLimit);
}

function compactSummary(existing: string, messages: readonly ConversationMessage[]): string {
  const lines = messages.map((message) => `${message.role}: ${clipText(message.content, 360)}`);
  const parts = [
    existing,
    lines.length === 0 ? "" : `Compressed conversation summary:\n${lines.join("\n")}`
  ].filter((part) => part.trim() !== "");

  return clipSummary(parts.join("\n\n"));
}

function toModelMessages(systemPrompt: string, conversation: Conversation): readonly AgentModelMessage[] {
  return [
    { content: systemPrompt, role: "system" },
    ...summaryMessage(conversation.summary),
    ...conversation.messages.map((message) => ({ content: message.content, role: message.role }))
  ];
}

function summaryMessage(summary: string): readonly AgentModelMessage[] {
  return summary.trim() === "" ? [] : [{ content: summary, role: "system" }];
}

function replaceLatestUserPrompt(
  messages: readonly AgentModelMessage[],
  prompt: string
): readonly AgentModelMessage[] {
  const index = findLastUserIndex(messages);
  if (index === -1) return messages;

  return messages.map((message, current) => current === index ? { ...message, content: prompt } : message);
}

function findLastUserIndex(messages: readonly AgentModelMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return index;
  }

  return -1;
}

function estimateContextTokens(systemPrompt: string, conversation: Conversation): number {
  const systemTokens = estimateTokens(systemPrompt);
  const summaryTokens = estimateTokens(conversation.summary);
  return systemTokens + summaryTokens + conversation.messages.reduce((sum, message) => {
    return sum + estimateTokens(message.content) + MESSAGE_TOKEN_OVERHEAD;
  }, MESSAGE_TOKEN_OVERHEAD);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function markCompacted(conversation: Conversation): Conversation {
  return {
    ...conversation,
    context: {
      compactedAt: Date.now(),
      compressionCount: conversation.context.compressionCount + 1,
      estimatedTokens: estimateContextTokens("", conversation)
    }
  };
}

function clipSummary(summary: string): string {
  const budget = SUMMARY_TOKEN_LIMIT * CHARS_PER_TOKEN;
  if (summary.length <= budget) return summary;
  return `${summary.slice(0, budget / 2)}\n...\n${summary.slice(-budget / 2)}`;
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}
