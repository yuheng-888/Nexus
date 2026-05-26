export type AgentMode = "interactive" | "print";
export type AgentOutputFormat = "text" | "json" | "stream-json";
export type SessionKind = "terminal" | "agent" | "subagent";

export interface WorkspaceInfo {
  readonly root: string | null;
}

export interface DirectoryEntry {
  readonly absolutePath: string;
  readonly isDirectory: boolean;
  readonly name: string;
  readonly path: string;
}

export interface FileReadResult {
  readonly absolutePath: string;
  readonly content: string;
  readonly mtimeMs: number;
  readonly path: string;
}

export interface SearchRequest {
  readonly cwd?: string;
  readonly query: string;
}

export interface SearchMatch {
  readonly line: number;
  readonly path: string;
  readonly preview: string;
}

export interface SearchReplaceRequest {
  readonly cwd?: string;
  readonly paths?: readonly string[];
  readonly query: string;
  readonly replacement: string;
}

export interface SearchReplaceLinePreview {
  readonly after: string;
  readonly before: string;
  readonly line: number;
}

export interface SearchReplaceFilePreview {
  readonly matches: number;
  readonly path: string;
  readonly previews: readonly SearchReplaceLinePreview[];
}

export interface SearchReplacePreviewResult {
  readonly files: readonly SearchReplaceFilePreview[];
  readonly totalMatches: number;
}

export interface SearchReplaceApplyResult {
  readonly filesChanged: number;
  readonly paths: readonly string[];
  readonly totalMatches: number;
}

export interface TerminalCreateOptions {
  readonly cols?: number;
  readonly cwd?: string;
  readonly rows?: number;
  readonly shell?: string;
}

export interface AgentStartOptions {
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly conversationId?: string;
  readonly cwd?: string;
  readonly mode?: AgentMode;
  readonly model?: string;
  readonly outputFormat?: AgentOutputFormat;
  readonly prompt: string;
}

export interface AgentMessageAttachment {
  readonly dataUrl: string;
  readonly mimeType: string;
  readonly name: string;
}

export interface SubagentProfile {
  readonly description: string;
  readonly id: string;
  readonly name: string;
}

export interface SubagentStartOptions {
  readonly attachments?: readonly AgentMessageAttachment[];
  readonly conversationId?: string;
  readonly cwd?: string;
  readonly model?: string;
  readonly profileId?: string;
  readonly prompt: string;
}

export type SubagentRunStatus = "running" | "exited";

export interface SubagentRun {
  readonly exitCode?: number;
  readonly id: string;
  readonly profile: SubagentProfile;
  readonly prompt: string;
  readonly session: SessionSnapshot;
  readonly startedAt: number;
  readonly status: SubagentRunStatus;
}

export interface SessionSnapshot {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
  readonly id: string;
  readonly kind: SessionKind;
}

export interface GitStatusResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// ── Conversations ──

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
  readonly createdAt: number;
  readonly id: string;
  readonly messages: readonly ConversationMessage[];
  readonly summary: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly context: ConversationCompressionState;
}

export interface ConversationSummary {
  readonly id: string;
  readonly messageCount: number;
  readonly title: string;
  readonly updatedAt: number;
}

// ── Marketplace ──

export type {
  InstallResult,
  Plugin,
  PluginContributionSummary,
  PluginSearchRequest,
  Skill,
  SkillsSearchRequest
} from "./marketplaceContracts.js";

// ── MCP Services ──

export type McpMarketplaceSource = "all" | "glama" | "mcp.so";
export type McpServerSource = "builtin" | "manual" | Exclude<McpMarketplaceSource, "all">;
export type McpServerTransport = "stdio" | "sse" | "http";

export interface McpServer {
  readonly args: readonly string[];
  readonly author?: string;
  readonly category?: string;
  readonly command?: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly env: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly marketplaceId?: string;
  readonly marketplaceUrl?: string;
  readonly name: string;
  readonly repositoryUrl?: string;
  readonly source: McpServerSource;
  readonly type: McpServerTransport;
  readonly url?: string;
}

export interface McpSearchRequest {
  readonly query?: string;
  readonly source?: McpMarketplaceSource;
}

export interface McpMarketplaceServer {
  readonly args: readonly string[];
  readonly author: string;
  readonly category: string;
  readonly command?: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly env: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly id: string;
  readonly installError?: string;
  readonly installable: boolean;
  readonly installed: boolean;
  readonly marketplaceUrl: string;
  readonly name: string;
  readonly repositoryUrl?: string;
  readonly serverName?: string;
  readonly source: Exclude<McpMarketplaceSource, "all">;
  readonly type: McpServerTransport;
  readonly url?: string;
}

export type McpServerAddRequest = Pick<
  McpServer,
  "args" | "command" | "env" | "headers" | "name" | "type" | "url"
> & Partial<Pick<McpServer, "description">>;

// ── API Configuration ──

export type ApiProvider = "openai" | "anthropic" | "google" | "deepseek" | "custom";

export interface ApiProviderPreset {
  readonly provider: ApiProvider;
  readonly name: string;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly defaultModel: string;
  readonly authHeader: string;
  readonly authPrefix: string;
  readonly description: string;
}

export interface ApiConfig {
  readonly id: string;
  readonly name: string;
  readonly provider: ApiProvider;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly enabled: boolean;
  // Custom protocol fields
  readonly customMethod?: "POST" | "GET" | "PUT";
  readonly customHeaders?: Record<string, string>;
  readonly customBodyTemplate?: string;
  readonly customResponsePath?: string;
}

export interface ApiTestResult {
  readonly success: boolean;
  readonly message: string;
  readonly latency?: number;
}
