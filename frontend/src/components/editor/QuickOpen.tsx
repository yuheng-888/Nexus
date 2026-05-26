import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { DirectoryEntry } from "../../types/nexus";
import { openQuickOpenFile } from "./quickOpenFiles";
import "./QuickOpen.css";

const QUICK_OPEN_DEBOUNCE_MS = 120;
const QUICK_OPEN_RESULT_LIMIT = 80;

interface QuickOpenProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const controller = useQuickOpenController({ onClose, open, query });

  useQuickOpenFocus(open, inputRef);
  const handleKeyDown = useQuickOpenKeys({
    entries: controller.entries,
    onClose,
    openSelected: controller.openSelected,
    setSelectedIndex: controller.setSelectedIndex
  });

  if (!open) return null;

  return (
    <div className="quick-open-backdrop" onMouseDown={onClose}>
      <div className="quick-open-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quick-open-input-row">
          <Search className="quick-open-search-icon" size={16} />
          <input
            ref={inputRef}
            className="quick-open-input"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入文件名或路径"
            value={query}
          />
          <span className="quick-open-hint">Enter 打开 · Esc 关闭</span>
        </div>
        <QuickOpenBody
          entries={controller.entries}
          error={controller.error}
          loading={controller.loading}
          onOpen={controller.openEntry}
          selectedIndex={controller.selectedIndex}
          setSelectedIndex={controller.setSelectedIndex}
          workspaceRoot={controller.workspaceRoot}
        />
      </div>
    </div>
  );
}

interface QuickOpenControllerOptions {
  readonly onClose: () => void;
  readonly open: boolean;
  readonly query: string;
}

function useQuickOpenController(options: QuickOpenControllerOptions) {
  const [entries, setEntries] = useState<readonly DirectoryEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const openFile = useStore((state) => state.openFile);
  const workspaceRoot = useStore((state) => state.workspaceRoot);

  useQuickOpenSearch({
    open: options.open,
    query: options.query,
    setEntries,
    setError,
    setLoading,
    setSelectedIndex,
    workspaceRoot
  });

  const openEntry = useCallback(async (entry: DirectoryEntry) => {
    setError("");
    try {
      await openQuickOpenFile({ entry, openFile, read: window.nexus.file.read });
      options.onClose();
    } catch (err) {
      setError(formatQuickOpenError("打开失败", err));
    }
  }, [openFile, options]);

  const selectedEntry = useMemo(() => entries[selectedIndex], [entries, selectedIndex]);
  const openSelected = useCallback(() => {
    if (selectedEntry !== undefined) void openEntry(selectedEntry);
  }, [openEntry, selectedEntry]);

  return { entries, error, loading, openEntry, openSelected, selectedIndex, setSelectedIndex, workspaceRoot };
}

interface QuickOpenBodyProps {
  readonly entries: readonly DirectoryEntry[];
  readonly error: string;
  readonly loading: boolean;
  readonly onOpen: (entry: DirectoryEntry) => void;
  readonly selectedIndex: number;
  readonly setSelectedIndex: (index: number) => void;
  readonly workspaceRoot: string | null;
}

function QuickOpenBody(props: QuickOpenBodyProps) {
  if (props.workspaceRoot === null) {
    return <div className="quick-open-body"><div className="quick-open-empty">请先导入一个项目</div></div>;
  }

  if (props.error !== "") {
    return <div className="quick-open-body"><div className="quick-open-error">{props.error}</div></div>;
  }

  if (props.loading && props.entries.length === 0) {
    return <div className="quick-open-body"><div className="quick-open-empty">正在搜索文件...</div></div>;
  }

  if (props.entries.length === 0) {
    return <div className="quick-open-body"><div className="quick-open-empty">没有匹配的文件</div></div>;
  }

  return (
    <div className="quick-open-body">
      {props.entries.map((entry, index) => (
        <QuickOpenRow
          entry={entry}
          key={entry.path}
          onOpen={() => props.onOpen(entry)}
          onSelect={() => props.setSelectedIndex(index)}
          selected={index === props.selectedIndex}
        />
      ))}
    </div>
  );
}

interface QuickOpenRowProps {
  readonly entry: DirectoryEntry;
  readonly onOpen: () => void;
  readonly onSelect: () => void;
  readonly selected: boolean;
}

function QuickOpenRow({ entry, onOpen, onSelect, selected }: QuickOpenRowProps) {
  return (
    <button
      className="quick-open-row"
      data-selected={selected}
      onClick={onOpen}
      onMouseEnter={onSelect}
      type="button"
    >
      <FileText className="quick-open-row-icon" size={16} />
      <span className="quick-open-row-text">
        <span className="quick-open-row-name">{entry.name}</span>
        <span className="quick-open-row-path">{entry.path}</span>
      </span>
    </button>
  );
}

interface QuickOpenSearchOptions {
  readonly open: boolean;
  readonly query: string;
  readonly setEntries: (entries: readonly DirectoryEntry[]) => void;
  readonly setError: (error: string) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly setSelectedIndex: (index: number) => void;
  readonly workspaceRoot: string | null;
}

function useQuickOpenSearch(options: QuickOpenSearchOptions): void {
  const { open, query, setEntries, setError, setLoading, setSelectedIndex, workspaceRoot } = options;

  useEffect(() => {
    if (!open) return;
    if (workspaceRoot === null) {
      resetSearch(options);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void loadQuickOpenEntries(options, () => cancelled);
    }, QUICK_OPEN_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, setEntries, setError, setLoading, setSelectedIndex, workspaceRoot]);
}

async function loadQuickOpenEntries(
  options: QuickOpenSearchOptions,
  isCancelled: () => boolean
): Promise<void> {
  try {
    const matches = await window.nexus.file.find(options.query);
    if (isCancelled()) return;
    options.setEntries(matches.slice(0, QUICK_OPEN_RESULT_LIMIT));
    options.setSelectedIndex(0);
  } catch (err) {
    if (!isCancelled()) options.setError(formatQuickOpenError("搜索失败", err));
  } finally {
    if (!isCancelled()) options.setLoading(false);
  }
}

function resetSearch(options: QuickOpenSearchOptions): void {
  options.setEntries([]);
  options.setError("");
  options.setLoading(false);
  options.setSelectedIndex(0);
}

function useQuickOpenFocus(open: boolean, inputRef: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    if (!open) return;

    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef, open]);
}

interface QuickOpenKeyOptions {
  readonly entries: readonly DirectoryEntry[];
  readonly onClose: () => void;
  readonly openSelected: () => void;
  readonly setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}

function useQuickOpenKeys(options: QuickOpenKeyOptions): (event: React.KeyboardEvent<HTMLInputElement>) => void {
  const { entries, onClose, openSelected, setSelectedIndex } = options;

  return useCallback((event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    handleSelectionKey(event, { entries, onClose, openSelected, setSelectedIndex });
  }, [entries, onClose, openSelected, setSelectedIndex]);
}

function handleSelectionKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  options: QuickOpenKeyOptions
): void {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    options.setSelectedIndex((index) => nextIndex(index, options.entries.length));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    options.setSelectedIndex((index) => previousIndex(index, options.entries.length));
  } else if (event.key === "Enter") {
    event.preventDefault();
    options.openSelected();
  }
}

function nextIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.min(index + 1, length - 1);
}

function previousIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.max(index - 1, 0);
}

function formatQuickOpenError(prefix: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `${prefix}: ${message}`;
}
