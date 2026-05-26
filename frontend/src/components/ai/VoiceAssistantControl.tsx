import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { createWakeReply, includesWakeWord } from "./voiceWake";

export interface VoiceAssistantControlProps {
  readonly disabled?: boolean;
  readonly onWakeReply: (reply: string) => void;
}

type VoiceState = "idle" | "listening" | "error";

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): {
      readonly length: number;
      item(index: number): { readonly transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { readonly error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const LISTENING_LABEL = "天枢监听中";
const WAKE_COOLDOWN_MS = 2500;

export function VoiceAssistantControl({ disabled = false, onWakeReply }: VoiceAssistantControlProps) {
  const [error, setError] = useState("");
  const [state, setState] = useState<VoiceState>("idle");
  const listeningRef = useRef(false);
  const lastWakeAtRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => stopRecognition(recognitionRef, listeningRef, setState), []);

  const handleWake = useCallback(() => {
    const now = Date.now();
    if (now - lastWakeAtRef.current < WAKE_COOLDOWN_MS) {
      return;
    }

    lastWakeAtRef.current = now;
    const reply = createWakeReply();
    speak(reply);
    onWakeReply(reply);
  }, [onWakeReply]);

  const toggleListening = useCallback(() => {
    if (disabled) {
      return;
    }

    if (listeningRef.current) {
      stopRecognition(recognitionRef, listeningRef, setState);
      return;
    }

    try {
      const recognition = createRecognition(handleWake, (message) => {
        setError(message);
        setState("error");
        listeningRef.current = false;
      });
      recognition.onend = () => {
        if (listeningRef.current) {
          recognition.start();
        }
      };
      recognitionRef.current = recognition;
      listeningRef.current = true;
      setError("");
      setState("listening");
      recognition.start();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setState("error");
      listeningRef.current = false;
    }
  }, [disabled, handleWake]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        disabled={disabled}
        onClick={toggleListening}
        style={voiceButtonStyle(state, disabled)}
        title={state === "listening" ? "停止语音唤醒" : "开启语音唤醒：天枢"}
      >
        {state === "listening" ? <Mic size={13} /> : <MicOff size={13} />}
      </button>
      {state === "listening" && <span style={statusStyle}>{LISTENING_LABEL}</span>}
      {state === "error" && <span style={errorStyle}>{error}</span>}
    </div>
  );
}

function createRecognition(onWake: () => void, onError: (message: string) => void): SpeechRecognitionLike {
  const Constructor = getSpeechRecognitionConstructor();
  const recognition = new Constructor();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "zh-CN";
  recognition.onresult = (event) => {
    if (includesWakeWord(readTranscript(event))) {
      onWake();
    }
  };
  recognition.onerror = (event) => {
    onError(`语音识别错误: ${event.error ?? "unknown"}`);
  };

  return recognition;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor {
  const candidate = getWindowRecord().SpeechRecognition ?? getWindowRecord().webkitSpeechRecognition;

  if (typeof candidate !== "function") {
    throw new Error("当前运行环境不支持语音识别");
  }

  return candidate as SpeechRecognitionConstructor;
}

function readTranscript(event: SpeechRecognitionEventLike): string {
  const parts: string[] = [];

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results.item(index);
    if (result.length > 0) {
      parts.push(result.item(0).transcript);
    }
  }

  return parts.join(" ");
}

function stopRecognition(
  recognitionRef: React.MutableRefObject<SpeechRecognitionLike | null>,
  listeningRef: React.MutableRefObject<boolean>,
  setState: (state: VoiceState) => void
): void {
  listeningRef.current = false;
  recognitionRef.current?.stop();
  recognitionRef.current = null;
  setState("idle");
}

function speak(text: string): void {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function getWindowRecord(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

function voiceButtonStyle(state: VoiceState, disabled: boolean): React.CSSProperties {
  return {
    alignItems: "center",
    background: state === "listening" ? "var(--accent-subtle)" : "transparent",
    border: `1px solid ${state === "listening" ? "var(--border-accent)" : "var(--border-subtle)"}`,
    borderRadius: "var(--radius-sm)",
    color: state === "listening" ? "var(--text-accent)" : "var(--text-muted)",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    height: 22,
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
    width: 22
  };
}

const statusStyle: React.CSSProperties = {
  color: "var(--text-accent)",
  fontSize: 10
};

const errorStyle: React.CSSProperties = {
  color: "var(--error)",
  fontSize: 10,
  maxWidth: 140,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
