import React from "react";
import { X } from "lucide-react";
import type { AgentMessageAttachment } from "../../types/nexus";

export function AttachmentTray(props: {
  readonly attachments: readonly AgentMessageAttachment[];
  readonly onRemove: (index: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {props.attachments.map((attachment, index) => (
        <div key={`${attachment.name}-${index}`} style={{ position: "relative" }}>
          <ImagePreview attachment={attachment} />
          <button onClick={() => props.onRemove(index)} style={removeButtonStyle} title="移除图片">
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ImagePreview({ attachment }: { readonly attachment: AgentMessageAttachment }) {
  return (
    <img
      alt={attachment.name}
      src={attachment.dataUrl}
      style={{ borderRadius: "var(--radius-sm)", height: 54, objectFit: "cover", width: 72 }}
    />
  );
}

export function iconButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    alignItems: "center",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    height: 36,
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
    width: 36
  };
}

export async function readImageAttachment(file: File): Promise<AgentMessageAttachment> {
  return {
    dataUrl: await readFileAsDataUrl(file),
    mimeType: file.type,
    name: file.name
  };
}

const removeButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "50%",
  color: "var(--text-primary)",
  cursor: "pointer",
  display: "flex",
  height: 18,
  justifyContent: "center",
  position: "absolute",
  right: -6,
  top: -6,
  width: 18
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read image: ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
