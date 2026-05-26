import type React from "react";
import type { ChatMessage } from "../../store/useStore";

export interface ChatMessageLayout {
  readonly alignItems: React.CSSProperties["alignItems"];
  readonly attachmentJustify: React.CSSProperties["justifyContent"];
  readonly flexDirection: React.CSSProperties["flexDirection"];
  readonly textAlign: React.CSSProperties["textAlign"];
}

export function chatMessageLayout(role: ChatMessage["role"]): ChatMessageLayout {
  if (role === "user") {
    return {
      alignItems: "flex-end",
      attachmentJustify: "flex-end",
      flexDirection: "row-reverse",
      textAlign: "right"
    };
  }

  return {
    alignItems: "flex-start",
    attachmentJustify: "flex-start",
    flexDirection: "row",
    textAlign: "left"
  };
}
