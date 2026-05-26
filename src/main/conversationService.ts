import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  Conversation,
  ConversationRole,
  ConversationSummary
} from "../contracts.js";
import {
  prepareConversationContext,
  refreshConversationContext,
  type ConversationContextResult
} from "./conversationContext.js";

const DEFAULT_STORE_PATH = join(homedir(), ".nexus", "conversations.json");
const DEFAULT_TITLE = "新会话";

interface ConversationStore {
  readonly conversations: readonly Conversation[];
}

interface AppendMessageInput {
  readonly content: string;
  readonly role: ConversationRole;
  readonly timestamp?: number;
}

interface PrepareModelMessagesInput {
  readonly contextTokenLimit: number;
  readonly conversationId: string;
  readonly prompt: string;
  readonly storedPrompt?: string;
  readonly systemPrompt: string;
}

export type PreparedConversationContext = ConversationContextResult;

export interface ConversationServiceOptions {
  readonly storePath?: string;
}

export class ConversationService {
  private readonly storePath: string;

  constructor(options: ConversationServiceOptions = {}) {
    this.storePath = options.storePath ?? DEFAULT_STORE_PATH;
  }

  async listConversations(): Promise<readonly ConversationSummary[]> {
    const store = await this.readStore();
    return store.conversations.map(toSummary).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getConversation(id: string): Promise<Conversation> {
    const store = await this.readStore();
    return store.conversations.find((item) => item.id === id) ?? createConversation(id);
  }

  async appendMessage(id: string, input: AppendMessageInput): Promise<Conversation> {
    const store = await this.readStore();
    const current = findOrCreateConversation(store, id);
    const next = appendMessage(current, input);
    await this.writeStore(upsertConversation(store, next));
    return next;
  }

  async clearConversation(id: string): Promise<Conversation> {
    const store = await this.readStore();
    const next = createConversation(id);
    await this.writeStore(upsertConversation(store, next));
    return next;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const store = await this.readStore();
    const next = store.conversations.filter((item) => item.id !== id);
    await this.writeStore({ conversations: next });
    return next.length !== store.conversations.length;
  }

  async prepareModelMessages(input: PrepareModelMessagesInput): Promise<PreparedConversationContext> {
    const withPrompt = await this.appendMessage(input.conversationId, {
      content: input.storedPrompt ?? input.prompt,
      role: "user"
    });
    const prepared = prepareConversationContext({
      contextTokenLimit: input.contextTokenLimit,
      conversation: withPrompt,
      modelPrompt: input.prompt,
      systemPrompt: input.systemPrompt
    });
    if (prepared.compacted) await this.writePreparedConversation(prepared.conversation);

    return prepared;
  }

  async appendAssistantMessage(id: string, content: string, contextTokenLimit: number): Promise<Conversation> {
    const conversation = await this.appendMessage(id, { content, role: "assistant" });
    const prepared = prepareConversationContext({
      contextTokenLimit,
      conversation,
      modelPrompt: "",
      systemPrompt: ""
    });
    if (prepared.compacted) await this.writePreparedConversation(prepared.conversation);
    return prepared.conversation;
  }

  private async writePreparedConversation(conversation: Conversation): Promise<void> {
    const store = await this.readStore();
    await this.writeStore(upsertConversation(store, conversation));
  }

  private async readStore(): Promise<ConversationStore> {
    try {
      const payload = JSON.parse(await readFile(this.storePath, "utf8")) as ConversationStore;
      if (!Array.isArray(payload.conversations)) throw new Error("会话存储缺少 conversations 数组");
      return { conversations: payload.conversations.map(normalizeConversation) };
    } catch (error) {
      if (isMissingFileError(error)) return { conversations: [] };
      throw error;
    }
  }

  private async writeStore(store: ConversationStore): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, `${JSON.stringify(store, null, 2)}\n`);
  }
}

function appendMessage(conversation: Conversation, input: AppendMessageInput): Conversation {
  const now = input.timestamp ?? Date.now();
  const message = { content: input.content, id: randomUUID(), role: input.role, timestamp: now };
  const messages = [...conversation.messages, message];

  return refreshConversationContext({
    ...conversation,
    messages,
    title: getConversationTitle(conversation, input),
    updatedAt: now
  });
}

function getConversationTitle(conversation: Conversation, input: AppendMessageInput): string {
  if (conversation.title !== DEFAULT_TITLE || input.role !== "user") return conversation.title;
  return clipText(input.content.replace(/\s+/g, " ").trim(), 48) || DEFAULT_TITLE;
}

function createConversation(id: string): Conversation {
  const now = Date.now();
  return {
    context: { compressionCount: 0, estimatedTokens: 0 },
    createdAt: now,
    id,
    messages: [],
    summary: "",
    title: DEFAULT_TITLE,
    updatedAt: now
  };
}

function findOrCreateConversation(store: ConversationStore, id: string): Conversation {
  return store.conversations.find((item) => item.id === id) ?? createConversation(id);
}

function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...createConversation(conversation.id),
    ...conversation,
    context: conversation.context ?? { compressionCount: 0, estimatedTokens: 0 },
    messages: Array.isArray(conversation.messages) ? conversation.messages : []
  };
}

function upsertConversation(store: ConversationStore, conversation: Conversation): ConversationStore {
  const exists = store.conversations.some((item) => item.id === conversation.id);
  const conversations = exists
    ? store.conversations.map((item) => item.id === conversation.id ? conversation : item)
    : [...store.conversations, conversation];

  return { conversations };
}

function toSummary(conversation: Conversation): ConversationSummary {
  return {
    id: conversation.id,
    messageCount: conversation.messages.length,
    title: conversation.title,
    updatedAt: conversation.updatedAt
  };
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
