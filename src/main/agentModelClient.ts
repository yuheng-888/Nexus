import type { ApiConfig } from "../contracts.js";
import { fillCustomBodyTemplate, readResponsePath } from "./customModelProtocol.js";
import { openAiChatCompletionsUrl } from "./modelEndpoint.js";
import { readJsonObjectResponse } from "./modelHttp.js";
import { toAnthropicMessage, toGoogleParts, toOpenAiMessage } from "./modelMessageFormat.js";

export type AgentModelRole = "system" | "user" | "assistant";

export interface AgentModelMessage {
  readonly attachments?: readonly AgentModelAttachment[];
  readonly content: string;
  readonly role: AgentModelRole;
}

export interface AgentModelAttachment {
  readonly dataUrl: string;
  readonly mimeType: string;
  readonly name: string;
}

export interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface AgentModelRequest {
  readonly config: ApiConfig;
  readonly messages: readonly AgentModelMessage[];
}

export interface AgentModelResponse {
  readonly text: string;
  readonly usage?: AgentUsage;
}

export interface AgentModelClient {
  complete(request: AgentModelRequest): Promise<AgentModelResponse>;
}

const ANTHROPIC_VERSION = "2023-06-01";

export class HttpAgentModelClient implements AgentModelClient {
  async complete(request: AgentModelRequest): Promise<AgentModelResponse> {
    assertRunnableConfig(request.config);

    if (request.config.provider === "anthropic") {
      return completeAnthropic(request);
    }

    if (request.config.provider === "google") {
      return completeGoogle(request);
    }

    return completeOpenAiCompatible(request);
  }
}

export function assertRunnableConfig(config: ApiConfig): void {
  if (!config.enabled) {
    throw new Error(`API config is disabled: ${config.name}`);
  }

  if (config.apiKey.trim() === "") {
    throw new Error(`API Key 未设置: ${config.name}`);
  }

  if (config.model.trim() === "") {
    throw new Error(`Model 未设置: ${config.name}`);
  }
}

async function completeAnthropic(request: AgentModelRequest): Promise<AgentModelResponse> {
  const response = await fetch(`${request.config.baseUrl}/v1/messages`, {
    body: JSON.stringify(toAnthropicBody(request)),
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": request.config.apiKey
    },
    method: "POST"
  });
  const data = await readJsonObjectResponse(response, "Model");

  return {
    text: readTextContent(data.content),
    usage: readAnthropicUsage(data.usage)
  };
}

function toAnthropicBody(request: AgentModelRequest): Record<string, unknown> {
  return {
    max_tokens: request.config.maxTokens,
    messages: request.messages.filter((message) => message.role !== "system").map(toAnthropicMessage),
    model: request.config.model,
    system: request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n"),
    temperature: request.config.temperature
  };
}

async function completeGoogle(request: AgentModelRequest): Promise<AgentModelResponse> {
  const url = `${request.config.baseUrl}/models/${request.config.model}:generateContent?key=${request.config.apiKey}`;
  const response = await fetch(url, {
    body: JSON.stringify(toGoogleBody(request)),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const data = await readJsonObjectResponse(response, "Model");

  return {
    text: readGoogleText(data),
    usage: readGoogleUsage(data.usageMetadata)
  };
}

function toGoogleBody(request: AgentModelRequest): Record<string, unknown> {
  return {
    contents: request.messages.map(toGoogleMessage),
    generationConfig: {
      maxOutputTokens: request.config.maxTokens,
      temperature: request.config.temperature
    }
  };
}

function toGoogleMessage(message: AgentModelMessage): Record<string, unknown> {
  const role = message.role === "assistant" ? "model" : "user";

  return {
    parts: toGoogleParts(message),
    role
  };
}

async function completeOpenAiCompatible(request: AgentModelRequest): Promise<AgentModelResponse> {
  const response = await fetch(getOpenAiUrl(request.config), {
    body: getOpenAiBody(request),
    headers: getOpenAiHeaders(request.config),
    method: request.config.customMethod ?? "POST"
  });
  const data = await readJsonObjectResponse(response, "Model");

  return {
    text: readOpenAiText(data, request.config),
    usage: readOpenAiUsage(data.usage)
  };
}

function getOpenAiUrl(config: ApiConfig): string {
  return openAiChatCompletionsUrl(config.baseUrl);
}

function getOpenAiBody(request: AgentModelRequest): string {
  if (request.config.provider === "custom" && request.config.customBodyTemplate !== undefined) {
    return fillCustomBody(request);
  }

  return JSON.stringify({
    max_tokens: request.config.maxTokens,
    messages: request.messages.map(toOpenAiMessage),
    model: request.config.model,
    temperature: request.config.temperature
  });
}

function fillCustomBody(request: AgentModelRequest): string {
  return fillCustomBodyTemplate({
    messages: request.messages,
    model: request.config.model,
    template: request.config.customBodyTemplate ?? ""
  });
}

function getOpenAiHeaders(config: ApiConfig): Record<string, string> {
  return {
    ...(config.provider === "custom" ? config.customHeaders : undefined),
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json"
  };
}

function readAnthropicUsage(value: unknown): AgentUsage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    inputTokens: readNumber(value.input_tokens),
    outputTokens: readNumber(value.output_tokens)
  };
}

function readGoogleText(data: Record<string, unknown>): string {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = isRecord(candidates[0]) ? candidates[0] : {};
  const content = isRecord(first.content) ? first.content : {};

  return readPartsText(content.parts);
}

function readGoogleUsage(value: unknown): AgentUsage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    inputTokens: readNumber(value.promptTokenCount),
    outputTokens: readNumber(value.candidatesTokenCount),
    totalTokens: readNumber(value.totalTokenCount)
  };
}

function readOpenAiText(data: Record<string, unknown>, config: ApiConfig): string {
  if (config.provider === "custom" && config.customResponsePath !== undefined) {
    const value = readResponsePath(data, config.customResponsePath);
    if (value === undefined) throw new Error(`Custom response path not found: ${config.customResponsePath}`);
    return stringifyText(value);
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = isRecord(choices[0]) ? choices[0] : {};
  const message = isRecord(first.message) ? first.message : {};

  return stringifyText(message.content);
}

function readOpenAiUsage(value: unknown): AgentUsage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    inputTokens: readNumber(value.prompt_tokens),
    outputTokens: readNumber(value.completion_tokens),
    totalTokens: readNumber(value.total_tokens)
  };
}

function readTextContent(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyText(isRecord(item) ? item.text : item)).join("");
  }

  return stringifyText(value);
}

function readPartsText(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value.map((part) => stringifyText(isRecord(part) ? part.text : part)).join("");
}

function stringifyText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stringifyText).join("");
  }

  return "";
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
