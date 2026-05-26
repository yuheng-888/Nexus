import { useCallback, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export function useTerminal() {
  const addTerminalSession = useStore((s) => s.addTerminalSession);
  const removeTerminalSession = useStore((s) => s.removeTerminalSession);

  const createTerminal = useCallback(async () => {
    try {
      const session = await window.nexus.terminal.create({ cols: 80, rows: 24 });
      addTerminalSession(session);
      return session;
    } catch (err) {
      console.error("Failed to create terminal:", err);
      return null;
    }
  }, [addTerminalSession]);

  const killTerminal = useCallback(
    async (sessionId: string) => {
      try {
        await window.nexus.session.kill(sessionId);
        removeTerminalSession(sessionId);
      } catch (err) {
        console.error("Failed to kill terminal:", err);
      }
    },
    [removeTerminalSession]
  );

  return { createTerminal, killTerminal };
}

export function useSessionData(
  sessionId: string | null,
  onData: (data: string) => void
) {
  const callbackRef = useRef(onData);
  callbackRef.current = onData;

  useEffect(() => {
    if (!sessionId) return;
    const off = window.nexus.session.onData((event) => {
      if (event.sessionId === sessionId) {
        callbackRef.current(event.data);
      }
    });
    return off;
  }, [sessionId]);
}

export function useSessionExit(
  sessionId: string | null,
  onExit: (exitCode: number) => void
) {
  const callbackRef = useRef(onExit);
  callbackRef.current = onExit;

  useEffect(() => {
    if (!sessionId) return;
    const off = window.nexus.session.onExit((event) => {
      if (event.sessionId === sessionId) {
        callbackRef.current(event.exitCode);
      }
    });
    return off;
  }, [sessionId]);
}
