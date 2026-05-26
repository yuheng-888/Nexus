import type { AgentModelMessage } from "./agentModelClient.js";

interface CustomBodyInput {
  readonly messages: readonly AgentModelMessage[];
  readonly model: string;
  readonly template: string;
}

const PATH_TOKEN_PATTERN = /([^.[\]]+)|\[(\d+)]/g;

export function fillCustomBodyTemplate(input: CustomBodyInput): string {
  const prompt = buildPromptText(input.messages);

  return input.template
    .replaceAll("{{messagesJson}}", JSON.stringify(input.messages))
    .replaceAll("{{modelJson}}", JSON.stringify(input.model))
    .replaceAll("{{promptJson}}", JSON.stringify(prompt))
    .replaceAll("{{model}}", escapeJsonString(input.model))
    .replaceAll("{{prompt}}", escapeJsonString(prompt));
}

export function readResponsePath(data: Record<string, unknown>, path: string): unknown {
  return tokenizePath(path).reduce<unknown>((current, token) => {
    if (typeof token === "number") return Array.isArray(current) ? current[token] : undefined;
    return isRecord(current) ? current[token] : undefined;
  }, data);
}

function buildPromptText(messages: readonly AgentModelMessage[]): string {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
}

function tokenizePath(path: string): readonly (string | number)[] {
  return [...path.matchAll(PATH_TOKEN_PATTERN)].map((match) => {
    return match[2] === undefined ? match[1] : Number(match[2]);
  });
}

function escapeJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
