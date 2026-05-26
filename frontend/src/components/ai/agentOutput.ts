import type { AgentMessageAttachment, ApiConfig, SessionSnapshot } from "../../types/nexus";

export type AiAgentProvider = "main" | "subagent";
export type AgentModelStartOptions = Pick<ApiConfig, "model">;

export function getAgentName(provider: AiAgentProvider): string {
  return provider === "subagent" ? "Nexus 子代理" : "Nexus 主助手";
}

export function getModelStartOptions(
  _provider: AiAgentProvider,
  config: ApiConfig | null
): Partial<AgentModelStartOptions> {
  if (config === null || config.model.trim() === "") {
    return {};
  }

  return { model: config.model };
}

export function startChatAgent(
  input: {
    readonly config: ApiConfig | null;
    readonly attachments?: readonly AgentMessageAttachment[];
    readonly conversationId?: string;
    readonly prompt: string;
    readonly provider: AiAgentProvider;
  }
): Promise<SessionSnapshot> {
  const modelOptions = getModelStartOptions(input.provider, input.config);

  if (input.provider === "subagent") {
    return window.nexus.subagents.start({
      attachments: input.attachments,
      conversationId: input.conversationId,
      ...modelOptions,
      prompt: input.prompt
    }).then((run) => run.session);
  }

  return window.nexus.agent.start({
    attachments: input.attachments,
    conversationId: input.conversationId,
    ...modelOptions,
    prompt: input.prompt
  });
}

export function parseAgentOutput(buffer: string, provider: AiAgentProvider): string {
  const parsed = parseOutputBuffer(buffer, provider);

  if (parsed.text.trim() !== "") return parsed.text;
  return parsed.hasPlainText ? buffer : "";
}

export interface StreamingAgentOutput {
  readonly content: string;
  readonly shouldRender: boolean;
}

export function getStreamingAgentOutput(buffer: string, provider: AiAgentProvider): StreamingAgentOutput {
  const content = parseAgentOutput(buffer, provider);
  return { content, shouldRender: content.trim() !== "" };
}

export function getFinalAgentOutput(buffer: string, provider: AiAgentProvider): string {
  const content = parseAgentOutput(buffer, provider);
  return content.trim() === "" ? "无响应" : content;
}

interface ParsedOutputBuffer {
  readonly hasPlainText: boolean;
  readonly text: string;
}

function parseOutputBuffer(buffer: string, provider: AiAgentProvider): ParsedOutputBuffer {
  return buffer.split("\n").reduce<ParsedOutputBuffer>((result, line) => {
    const chunk = parseOutputLine(line, provider);
    return {
      hasPlainText: result.hasPlainText || chunk.plain,
      text: `${result.text}${chunk.text}`
    };
  }, { hasPlainText: false, text: "" });
}

function parseOutputLine(line: string, provider: AiAgentProvider): { readonly plain: boolean; readonly text: string } {
  if (line.trim() === "") {
    return { plain: false, text: "" };
  }

  try {
    const event = JSON.parse(line) as unknown;
    return { plain: false, text: extractNativeText(event, provider) };
  } catch {
    return { plain: true, text: `${line}\n` };
  }
}

function extractNativeText(event: unknown, _provider: AiAgentProvider): string {
  if (!isRecord(event)) {
    return "";
  }

  const type = typeof event.type === "string" ? event.type : "";
  if (type.endsWith(".started") || type.endsWith(".completed")) {
    return "";
  }

  return readTextFields(event, ["message", "text", "content", "delta", "last_agent_message"]);
}

function readTextFields(event: Record<string, unknown>, keys: readonly string[]): string {
  return keys.map((key) => stringifyContent(event[key])).join("");
}

function stringifyContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stringifyContent).join("");
  }

  if (isRecord(value)) {
    return readTextFields(value, ["text", "content", "message"]);
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
