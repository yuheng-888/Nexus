import { useEffect } from "react";

interface ShortcutLikeEvent {
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
}

export function isQuickOpenShortcut(event: ShortcutLikeEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p";
}

export function useQuickOpenShortcut(onOpen: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isQuickOpenShortcut(event)) return;

      event.preventDefault();
      onOpen();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}
