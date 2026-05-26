import { useEffect } from "react";
import { isCommandPaletteShortcut } from "./commandPaletteModel";

export function useCommandPaletteShortcut(onOpen: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isCommandPaletteShortcut(event)) return;

      event.preventDefault();
      onOpen();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}
