import type { AgentMessageAttachment } from "../contracts.js";
import type { AgentModelMessage } from "./agentModelClient.js";

const IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,/i;

export function attachImagesToLastUserMessage(
  messages: readonly AgentModelMessage[],
  attachments: readonly AgentMessageAttachment[] | undefined
): readonly AgentModelMessage[] {
  if (attachments === undefined || attachments.length === 0) return messages;
  const index = findLastUserMessageIndex(messages);
  if (index === -1) throw new Error("No user message is available for image attachments");
  return messages.map((message, current) => current === index ? withAttachments(message, attachments) : message);
}

function findLastUserMessageIndex(messages: readonly AgentModelMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return index;
  }
  return -1;
}

function withAttachments(
  message: AgentModelMessage,
  attachments: readonly AgentMessageAttachment[]
): AgentModelMessage {
  return {
    ...message,
    attachments: [...(message.attachments ?? []), ...attachments.map(validateImageAttachment)]
  };
}

function validateImageAttachment(attachment: AgentMessageAttachment): AgentMessageAttachment {
  const match = attachment.dataUrl.match(IMAGE_DATA_URL_PATTERN);
  if (match?.[1] === undefined) throw new Error(`Invalid image data URL: ${attachment.name}`);
  if (attachment.mimeType !== "" && attachment.mimeType.toLowerCase() !== match[1].toLowerCase()) {
    throw new Error(`Image MIME type does not match data URL: ${attachment.name}`);
  }
  return { ...attachment, mimeType: match[1].toLowerCase() };
}
