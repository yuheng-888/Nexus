import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Command } from "lucide-react";
import { filterCommandPaletteItems, runCommandPaletteItem, type CommandPaletteItem } from "./commandPaletteModel";
import { useNexusCommands } from "./useNexusCommands";
import "./CommandPalette.css";

interface CommandPaletteProps {
  readonly onClose: () => void;
  readonly onOpenQuickOpen: () => void;
  readonly open: boolean;
}

export function CommandPalette(props: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const controller = useCommandPaletteController(props, query);
  const handleKeyDown = useCommandPaletteKeys(controller, props.onClose);

  useCommandPaletteFocus(props.open, inputRef);
  if (!props.open) return null;

  return (
    <div className="command-palette-backdrop" onMouseDown={props.onClose}>
      <div className="command-palette-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-palette-input-row">
          <Command className="command-palette-icon" size={16} />
          <input
            className="command-palette-input"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令"
            ref={inputRef}
            value={query}
          />
          <span className="command-palette-hint">Enter 执行 · Esc 关闭</span>
        </div>
        <CommandPaletteBody controller={controller} />
      </div>
    </div>
  );
}

function useCommandPaletteController(props: CommandPaletteProps, query: string) {
  const [error, setError] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commands = useNexusCommands({
    onClose: props.onClose,
    onOpenQuickOpen: props.onOpenQuickOpen,
    onSetError: setError
  });
  const items = useMemo(() => filterCommandPaletteItems(commands, query), [commands, query]);
  const selected = items[selectedIndex];

  useEffect(() => setSelectedIndex(0), [query]);

  const runItem = useCallback(async (item: CommandPaletteItem) => {
    if (runningId !== null) return;

    setError("");
    setRunningId(item.id);
    try {
      await runCommandPaletteItem(item);
      props.onClose();
    } catch (caught) {
      setError(formatCommandError(caught));
    } finally {
      setRunningId(null);
    }
  }, [props, runningId]);

  const runSelected = useCallback(async () => {
    if (selected !== undefined) await runItem(selected);
  }, [runItem, selected]);

  return { error, items, runItem, runSelected, runningId, selectedIndex, setSelectedIndex };
}

function CommandPaletteBody(props: { readonly controller: ReturnType<typeof useCommandPaletteController> }) {
  const controller = props.controller;
  if (controller.error !== "") return <div className="command-palette-body"><div className="command-palette-error">{controller.error}</div></div>;
  if (controller.runningId !== null) return <div className="command-palette-body"><div className="command-palette-running">正在执行命令...</div></div>;
  if (controller.items.length === 0) return <div className="command-palette-body"><div className="command-palette-empty">没有匹配的命令</div></div>;

  return (
    <div className="command-palette-body">
      {controller.items.map((item, index) => (
        <CommandPaletteRow
          item={item}
          key={item.id}
          onRun={() => controller.runItem(item)}
          onSelect={() => controller.setSelectedIndex(index)}
          selected={index === controller.selectedIndex}
        />
      ))}
    </div>
  );
}

function CommandPaletteRow(props: {
  readonly item: CommandPaletteItem;
  readonly onRun: () => void;
  readonly onSelect: () => void;
  readonly selected: boolean;
}) {
  return (
    <button
      className="command-palette-row"
      data-selected={props.selected}
      onClick={() => void props.onRun()}
      onMouseEnter={props.onSelect}
      type="button"
    >
      <span className="command-palette-row-main">
        <span className="command-palette-row-title">{props.item.title}</span>
        <span className="command-palette-row-category">{props.item.category}</span>
      </span>
      {props.item.shortcut !== undefined && <span className="command-palette-shortcut">{props.item.shortcut}</span>}
    </button>
  );
}

function useCommandPaletteKeys(
  controller: ReturnType<typeof useCommandPaletteController>,
  onClose: () => void
) {
  return useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    handleCommandSelectionKey(event, controller);
  }, [controller, onClose]);
}

function handleCommandSelectionKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  controller: ReturnType<typeof useCommandPaletteController>
): void {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    controller.setSelectedIndex((index) => nextIndex(index, controller.items.length));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    controller.setSelectedIndex((index) => previousIndex(index, controller.items.length));
  } else if (event.key === "Enter") {
    event.preventDefault();
    void controller.runSelected();
  }
}

function nextIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.min(index + 1, length - 1);
}

function previousIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.max(index - 1, 0);
}

function useCommandPaletteFocus(open: boolean, inputRef: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    if (!open) return;

    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef, open]);
}

function formatCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `命令执行失败: ${message}`;
}
