import React, { useEffect, useRef, useCallback, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useStore } from "../../store/useStore";
import { useSessionData, useSessionExit } from "../../hooks/useSession";
import { Plus } from "lucide-react";

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

function TerminalInstance({ sessionId, isActive }: TerminalInstanceProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
      theme: {
        background: "#0b0d17",
        foreground: "#c4c4d4",
        cursor: "#8b5cf6",
        cursorAccent: "#0b0d17",
        selectionBackground: "rgba(139, 92, 246, 0.3)",
        selectionForeground: "#ffffff",
        black: "#151729",
        red: "#f87171",
        green: "#34d399",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#a78bfa",
        cyan: "#22d3ee",
        white: "#c4c4d4",
        brightBlack: "#5c5d76",
        brightRed: "#fca5a5",
        brightGreen: "#6ee7b7",
        brightYellow: "#fde68a",
        brightBlue: "#93c5fd",
        brightMagenta: "#c4b5fd",
        brightCyan: "#67e8f9",
        brightWhite: "#e4e4ed",
      },
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 10000,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      window.nexus.session.write(sessionId, data);
    });

    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
          const t = terminalRef.current;
          if (t) {
            window.nexus.session.resize(sessionId, t.cols, t.rows);
          }
        } catch { /* ignore */ }
      }
    });
    observer.observe(termRef.current);
    resizeObsRef.current = observer;

    return () => {
      observer.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]);

  useSessionData(sessionId, (data) => {
    if (terminalRef.current) terminalRef.current.write(data);
  });

  useSessionExit(sessionId, () => {
    if (terminalRef.current) terminalRef.current.write("\r\n\x1b[90m[进程已退出]\x1b[0m");
  });

  return (
    <div ref={termRef} style={{
      width: "100%", height: "100%",
      display: isActive ? "block" : "none",
      padding: "4px 0",
    }} />
  );
}

export function TerminalView() {
  const terminalSessions = useStore((s) => s.terminalSessions);
  const activeTerminal = useStore((s) => s.activeTerminal);
  const setActiveTerminal = useStore((s) => s.setActiveTerminal);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const session = await window.nexus.terminal.create({ cols: 80, rows: 24 });
      useStore.getState().addTerminalSession(session);
    } catch (err) {
      console.error("Failed to create terminal:", err);
    } finally {
      setCreating(false);
    }
  }, []);

  if (terminalSessions.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", color: "var(--text-muted)", gap: 12,
      }}>
        <span style={{ fontSize: 13 }}>暂无终端会话</span>
        <button
          style={{
            padding: "6px 16px", fontSize: 12,
            color: "white", background: "var(--accent)",
            border: "none", borderRadius: "var(--radius-sm)",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
          }}
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "创建中..." : "新建终端"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {terminalSessions.length > 1 && (
        <div style={{
          display: "flex", alignItems: "center", height: 28, minHeight: 28,
          background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)",
          overflow: "auto", flexShrink: 0, gap: 0,
        }}>
          {terminalSessions.map((session, i) => (
            <button
              key={session.id}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: "100%", padding: "0 12px",
                fontSize: 11, color: session.id === activeTerminal ? "var(--text-active)" : "var(--text-muted)",
                cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", whiteSpace: "nowrap",
                borderBottom: session.id === activeTerminal ? "2px solid var(--accent)" : "2px solid transparent",
              }}
              onClick={() => setActiveTerminal(session.id)}
            >
              终端 {i + 1}
            </button>
          ))}
        </div>
      )}
      {terminalSessions.map((session) => (
        <TerminalInstance
          key={session.id}
          sessionId={session.id}
          isActive={session.id === activeTerminal}
        />
      ))}
    </div>
  );
}
