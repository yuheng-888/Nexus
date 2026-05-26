import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore, type ChatMessage } from "../../store/useStore";
import { Send, Trash2, Loader2, Sparkles, ImagePlus } from "lucide-react";
import type { AgentMessageAttachment } from "../../types/nexus";
import { getAgentName, getFinalAgentOutput, getStreamingAgentOutput, startChatAgent, type AiAgentProvider } from "./agentOutput";
import { AiMessageList } from "./AiMessageList";
import { AttachmentTray, iconButtonStyle, readImageAttachment } from "./ImageAttachments";
import { ModelControls, useActiveAiConfig } from "./ModelControls";
import { aiSendBlockReason } from "./modelControlsModel";
import { AgentProviderSelect } from "./AgentProviderSelect";
import { VoiceAssistantControl } from "./VoiceAssistantControl";

const DEFAULT_CONVERSATION_ID = "main";

export function AiChat() {
  const aiMessages = useStore((s) => s.aiMessages);
  const addAiMessage = useStore((s) => s.addAiMessage);
  const clearAiMessages = useStore((s) => s.clearAiMessages);
  const aiSession = useStore((s) => s.aiSession);
  const setAiSession = useStore((s) => s.setAiSession);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<AgentMessageAttachment[]>([]);
  const [provider, setProvider] = useState<AiAgentProvider>("subagent");
  const [compressionCount, setCompressionCount] = useState(0);
  const activeConfig = useActiveAiConfig();
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef("");
  const agentName = getAgentName(provider);
  const sendBlockReason = aiSendBlockReason(activeConfig);

  const loadConversation = useCallback(async () => {
    const conversation = await window.nexus.conversations.get(DEFAULT_CONVERSATION_ID);
    useStore.setState({
      aiMessages: conversation.messages.map((message) => ({
        content: message.content,
        role: message.role,
        timestamp: message.timestamp
      }))
    });
    setCompressionCount(conversation.context.compressionCount);
  }, []);

  useEffect(() => {
    void loadConversation().catch((error: unknown) => {
      console.error("Failed to load AI conversation:", error);
    });
  }, [loadConversation]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [aiMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if ((prompt === "" && attachments.length === 0) || isStreaming || sendBlockReason !== null) return;

    const messageText = prompt === "" ? "请根据附图回答。" : prompt;
    const sentAttachments = attachments;
    const userMsg: ChatMessage = {
      attachments: sentAttachments,
      role: "user",
      content: messageText,
      timestamp: Date.now()
    };
    addAiMessage(userMsg);
    setInput("");
    setAttachments([]);
    setIsStreaming(true);
    streamBufferRef.current = "";

    try {
      const session = await startChatAgent({
        config: activeConfig,
        attachments: sentAttachments,
        conversationId: DEFAULT_CONVERSATION_ID,
        prompt: messageText,
        provider
      });
      setAiSession(session);

      const offData = window.nexus.session.onData((event) => {
        if (event.sessionId === session.id) {
          streamBufferRef.current += event.data;
          const output = getStreamingAgentOutput(streamBufferRef.current, provider);
          if (!output.shouldRender) return;
          const messages = useStore.getState().aiMessages;
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.role === "assistant") {
            useStore.setState({
              aiMessages: [...messages.slice(0, -1), { ...lastMsg, content: output.content }],
            });
          } else {
            addAiMessage({ role: "assistant", content: output.content, timestamp: Date.now() });
          }
        }
      });

      const offExit = window.nexus.session.onExit((event) => {
        if (event.sessionId === session.id) {
          setIsStreaming(false);
          const messages = useStore.getState().aiMessages;
          const lastMsg = messages[messages.length - 1];
          const finalContent = getFinalAgentOutput(streamBufferRef.current, provider);
          if (lastMsg?.role === "assistant" && !lastMsg.content) {
            useStore.setState({
              aiMessages: [...messages.slice(0, -1), { ...lastMsg, content: finalContent }],
            });
          } else if (lastMsg?.role !== "assistant") {
            addAiMessage({ role: "assistant", content: finalContent, timestamp: Date.now() });
          }
          offData(); offExit();
          setAiSession(null);
          if (event.exitCode === 0) {
            void loadConversation();
          }
        }
      });
    } catch (err) {
      console.error("AI agent start failed:", err);
      addAiMessage({ role: "assistant", content: `错误: ${err instanceof Error ? err.message : "启动 AI 代理失败"}`, timestamp: Date.now() });
      setIsStreaming(false);
    }
  }, [input, attachments, isStreaming, sendBlockReason, addAiMessage, activeConfig, provider, setAiSession, loadConversation]);

  const clearConversation = useCallback(async () => {
    if (aiSession) window.nexus.session.kill(aiSession.id);
    await window.nexus.conversations.clear(DEFAULT_CONVERSATION_ID);
    clearAiMessages();
    setCompressionCount(0);
    setAiSession(null);
    setIsStreaming(false);
  }, [aiSession, clearAiMessages, setAiSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const addImageFiles = useCallback(async (files: readonly File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const next = await Promise.all(images.map(readImageAttachment));
    setAttachments((current) => [...current, ...next]);
  }, []);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.files];
    if (files.some((file) => file.type.startsWith("image/"))) void addImageFiles(files);
  }, [addImageFiles]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((current) => current.filter((_attachment, currentIndex) => currentIndex !== index));
  }, []);

  const canSend = (input.trim() !== "" || attachments.length > 0) && !isStreaming && sendBlockReason === null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-panel)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="var(--text-accent)" />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>AI 助手</span>
          <ModelControls disabled={isStreaming} />
          <AgentProviderSelect disabled={isStreaming} onChange={setProvider} provider={provider} />
          <VoiceAssistantControl
            onWakeReply={(reply) => addAiMessage({ role: "assistant", content: reply, timestamp: Date.now() })}
          />
          {isStreaming && (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 10,
              background: "var(--accent-subtle)", color: "var(--text-accent)",
              animation: "pulse 2s ease-in-out infinite",
            }}>生成中</span>
          )}
          {compressionCount > 0 && (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 10,
              background: "var(--bg-badge)", color: "var(--text-muted)",
            }}>上下文已压缩 {compressionCount}</span>
          )}
        </div>
        {aiMessages.length > 0 && (
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "var(--radius-sm)",
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
            }}
            onClick={() => void clearConversation()}
            title="清空对话"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <AiMessageList agentName={agentName} isStreaming={isStreaming} messages={aiMessages} messagesRef={messagesRef} />

      {/* Input */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: "10px 12px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}>
        {attachments.length > 0 && <AttachmentTray attachments={attachments} onRemove={removeAttachment} />}
        {sendBlockReason !== null && <div style={modelNoticeStyle}>模型不可用: {sendBlockReason}</div>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <input
            accept="image/*"
            multiple
            onChange={(event) => {
              void addImageFiles([...event.target.files ?? []]);
              event.target.value = "";
            }}
            ref={fileInputRef}
            style={{ display: "none" }}
            type="file"
          />
          <button
            disabled={isStreaming}
            onClick={() => fileInputRef.current?.click()}
            style={iconButtonStyle(isStreaming)}
            title="添加图片"
            type="button"
          >
            <ImagePlus size={16} />
          </button>
          <textarea
            ref={textareaRef}
            style={{
              flex: 1, minHeight: 36, maxHeight: 120,
              padding: "8px 12px", fontSize: 13,
              color: "var(--text-primary)", background: "var(--bg-input)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
              outline: "none", fontFamily: "inherit", resize: "none", lineHeight: 1.4,
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息，或粘贴图片... (Shift+Enter 换行)"
            rows={1}
            disabled={isStreaming}
          />
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: "var(--radius-md)",
              background: canSend ? "var(--gradient-primary)" : "var(--bg-tertiary)",
              border: "none", color: "white", cursor: canSend ? "pointer" : "default",
              flexShrink: 0, opacity: canSend ? 1 : 0.5,
              transition: "all 0.2s var(--ease-out)",
              boxShadow: canSend ? "var(--shadow-glow)" : "none",
            }}
            onClick={handleSend}
            disabled={!canSend}
            title={sendBlockReason ?? "发送消息"}
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

const modelNoticeStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: 11,
  padding: "6px 8px"
};
