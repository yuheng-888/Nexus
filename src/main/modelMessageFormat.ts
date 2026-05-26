import type { AgentModelAttachment, AgentModelMessage } from "./agentModelClient.js";

export function toAnthropicMessage(message: AgentModelMessage): Record<string, unknown> {
  return {
    content: toAnthropicContent(message),
    role: message.role
  };
}

export function toGoogleParts(message: AgentModelMessage): readonly Record<string, unknown>[] {
  return [
    ...(message.attachments ?? []).map(toGoogleImagePart),
    { text: message.content }
  ];
}

export function toOpenAiMessage(message: AgentModelMessage): Record<string, unknown> {
  if (message.attachments === undefined || message.attachments.length === 0) {
    return { content: message.content, role: message.role };
  }
  return {
    content: [
      { text: message.content, type: "text" },
      ...message.attachments.map(toOpenAiImagePart)
    ],
    role: message.role
  };
}

export function stripDataUrlPrefix(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

function toAnthropicContent(message: AgentModelMessage): unknown {
  if (message.attachments === undefined || message.attachments.length === 0) return message.content;
  return [
    ...message.attachments.map(toAnthropicImageBlock),
    { text: message.content, type: "text" }
  ];
}

function toAnthropicImageBlock(attachment: AgentModelAttachment): Record<string, unknown> {
  return {
    source: {
      data: stripDataUrlPrefix(attachment.dataUrl),
      media_type: attachment.mimeType,
      type: "base64"
    },
    type: "image"
  };
}

function toGoogleImagePart(attachment: AgentModelAttachment): Record<string, unknown> {
  return {
    inlineData: {
      data: stripDataUrlPrefix(attachment.dataUrl),
      mimeType: attachment.mimeType
    }
  };
}

function toOpenAiImagePart(attachment: AgentModelAttachment): Record<string, unknown> {
  return {
    image_url: { url: attachment.dataUrl },
    type: "image_url"
  };
}
