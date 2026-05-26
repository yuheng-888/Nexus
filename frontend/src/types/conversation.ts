export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  readonly content: string;
  readonly id: string;
  readonly role: ConversationRole;
  readonly timestamp: number;
}

export interface ConversationCompressionState {
  readonly compactedAt?: number;
  readonly compressionCount: number;
  readonly estimatedTokens: number;
}

export interface Conversation {
  readonly context: ConversationCompressionState;
  readonly createdAt: number;
  readonly id: string;
  readonly messages: readonly ConversationMessage[];
  readonly summary: string;
  readonly title: string;
  readonly updatedAt: number;
}

export interface ConversationSummary {
  readonly id: string;
  readonly messageCount: number;
  readonly title: string;
  readonly updatedAt: number;
}
