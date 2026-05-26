import React from "react";
import { Bot, Loader2, Sparkles, User } from "lucide-react";
import type { ChatMessage } from "../../store/useStore";
import { chatMessageLayout } from "./chatMessageLayout";
import { ImagePreview } from "./ImageAttachments";

export function AiMessageList(props: {
  readonly agentName: string;
  readonly isStreaming: boolean;
  readonly messages: readonly ChatMessage[];
  readonly messagesRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={props.messagesRef} style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
      {props.messages.length === 0 ? <EmptyState agentName={props.agentName} /> : props.messages.map((msg, index) => (
        <MessageRow agentName={props.agentName} key={index} message={msg} />
      ))}
      {props.isStreaming && props.messages.at(-1)?.role !== "assistant" && (
        <StreamingRow agentName={props.agentName} />
      )}
    </div>
  );
}

function EmptyState({ agentName }: { readonly agentName: string }) {
  return (
    <div style={{ alignItems: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 8, height: "100%", justifyContent: "center" }}>
      <div style={{ alignItems: "center", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", display: "flex", height: 56, justifyContent: "center", marginBottom: 4, width: 56 }}>
        <Sparkles size={24} color="var(--text-accent)" />
      </div>
      <span style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>AI 编程助手</span>
      <span style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.6, textAlign: "center" }}>
        使用 {agentName}<br />帮你编写、调试和优化代码
      </span>
    </div>
  );
}

function MessageRow(props: {
  readonly agentName: string;
  readonly message: ChatMessage;
}) {
  const isUser = props.message.role === "user";
  const layout = chatMessageLayout(props.message.role);
  return (
    <div style={{ animation: "fadeIn 0.3s var(--ease-out)", display: "flex", flexDirection: layout.flexDirection, gap: 10, marginBottom: 16 }}>
      <Avatar isUser={isUser} />
      <div style={{ alignItems: layout.alignItems, display: "flex", flex: 1, flexDirection: "column", minWidth: 0 }}>
        <div style={{ color: isUser ? "var(--text-accent)" : "var(--success)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" }}>
          {isUser ? "你" : props.agentName}
        </div>
        {props.message.attachments !== undefined && props.message.attachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: layout.attachmentJustify, marginBottom: 6 }}>
            {props.message.attachments.map((attachment) => <ImagePreview attachment={attachment} key={attachment.dataUrl} />)}
          </div>
        )}
        <div style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7, maxWidth: "min(72ch, 100%)", textAlign: layout.textAlign, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {props.message.content}
        </div>
      </div>
    </div>
  );
}

function StreamingRow({ agentName }: { readonly agentName: string }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
      <div style={{ alignItems: "center", background: "linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(96, 165, 250, 0.2))", borderRadius: "var(--radius-sm)", display: "flex", height: 28, justifyContent: "center", width: 28 }}>
        <Loader2 size={14} color="var(--success)" className="animate-spin" />
      </div>
      <div>
        <div style={{ color: "var(--success)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" }}>{agentName}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>思考中...</div>
      </div>
    </div>
  );
}

function Avatar({ isUser }: { readonly isUser: boolean }) {
  return (
    <div style={{ alignItems: "center", background: isUser ? "var(--gradient-primary)" : "linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(96, 165, 250, 0.2))", borderRadius: "var(--radius-sm)", display: "flex", flexShrink: 0, height: 28, justifyContent: "center", width: 28 }}>
      {isUser ? <User size={14} color="white" /> : <Bot size={14} color="var(--success)" />}
    </div>
  );
}
