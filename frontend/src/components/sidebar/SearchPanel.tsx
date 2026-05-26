import React, { useCallback, useMemo, useRef, useState } from "react";
import { Check, Replace, Search, X } from "lucide-react";
import { useFileTree } from "../../hooks/useFileTree";
import { useStore } from "../../store/useStore";
import type { SearchMatch, SearchReplacePreviewResult } from "../../types/nexus";

const SEARCH_DELAY_MS = 300;
const PREVIEW_FILE_LIMIT = 4;

export function SearchPanel() {
  const state = useSearchPanelState();
  const { openFileByEntry } = useFileTree();
  const grouped = useMemo(() => groupMatches(state.searchResults), [state.searchResults]);

  return (
    <div style={panelStyle}>
      <SearchBox state={state} />
      <ReplaceBox state={state} />
      <SearchResults grouped={grouped} loading={state.searchLoading} onOpen={openFileByEntry} query={state.searchQuery} />
    </div>
  );
}

function useSearchPanelState() {
  const searchQuery = useStore((s) => s.searchQuery);
  const searchResults = useStore((s) => s.searchResults);
  const searchLoading = useStore((s) => s.searchLoading);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setSearchResults = useStore((s) => s.setSearchResults);
  const setSearchLoading = useStore((s) => s.setSearchLoading);
  const [replaceText, setReplaceText] = useState("");
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceMessage, setReplaceMessage] = useState("");
  const [replacePreview, setReplacePreview] = useState<SearchReplacePreviewResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSearch = useSearchRunner({ setReplacePreview, setSearchLoading, setSearchResults });
  const replaceActions = useReplaceActions({ doSearch, replaceText, searchQuery, setReplaceBusy, setReplaceMessage, setReplacePreview });

  return {
    ...replaceActions,
    debounceRef,
    doSearch,
    replaceBusy,
    replaceMessage,
    replacePreview,
    replaceText,
    searchLoading,
    searchQuery,
    searchResults,
    setReplaceMessage,
    setReplaceText,
    setReplacePreview,
    setSearchQuery,
    setSearchResults
  };
}

function useSearchRunner(options: {
  readonly setReplacePreview: (preview: SearchReplacePreviewResult | null) => void;
  readonly setSearchLoading: (loading: boolean) => void;
  readonly setSearchResults: (results: SearchMatch[]) => void;
}) {
  return useCallback(async (query: string) => {
    if (!query.trim()) {
      options.setSearchResults([]);
      return;
    }
    options.setSearchLoading(true);
    options.setReplacePreview(null);
    try {
      options.setSearchResults([...(await window.nexus.search({ query }))]);
    } catch (error) {
      console.error("Search failed:", error);
      options.setSearchResults([]);
    } finally {
      options.setSearchLoading(false);
    }
  }, [options]);
}

function useReplaceActions(options: {
  readonly doSearch: (query: string) => Promise<void>;
  readonly replaceText: string;
  readonly searchQuery: string;
  readonly setReplaceBusy: (busy: boolean) => void;
  readonly setReplaceMessage: (message: string) => void;
  readonly setReplacePreview: (preview: SearchReplacePreviewResult | null) => void;
}) {
  const previewReplace = useCallback(async () => runReplacePreview(options), [options]);
  const applyReplace = useCallback(async () => runReplaceApply(options), [options]);
  return { applyReplace, previewReplace };
}

function SearchBox({ state }: { readonly state: ReturnType<typeof useSearchPanelState> }) {
  const clearSearch = () => {
    state.setSearchQuery("");
    state.setSearchResults([]);
    state.setReplacePreview(null);
  };

  return (
    <div style={searchWrapStyle}>
      <Search size={13} style={searchIconStyle} />
      <input autoFocus onChange={(event) => changeSearch(event, state)} onKeyDown={(event) => submitSearch(event, state)} placeholder="全局搜索..." style={inputStyle} type="text" value={state.searchQuery} />
      {state.searchQuery && <IconButton icon={<X size={12} />} onClick={clearSearch} style={clearButtonStyle} />}
    </div>
  );
}

function ReplaceBox({ state }: { readonly state: ReturnType<typeof useSearchPanelState> }) {
  const disabled = state.replaceBusy || state.searchQuery.trim() === "";

  return (
    <div style={replaceWrapStyle}>
      <div style={replaceRowStyle}>
        <Replace size={13} style={{ color: "var(--text-muted)" }} />
        <input onChange={(event) => changeReplace(event, state)} placeholder="替换为..." style={replaceInputStyle} value={state.replaceText} />
      </div>
      <div style={replaceActionStyle}>
        <button disabled={disabled} onClick={() => void state.previewReplace()} style={buttonStyle(disabled)}>预览</button>
        <button disabled={disabled || state.replacePreview === null || state.replacePreview.totalMatches === 0} onClick={() => void state.applyReplace()} style={primaryButtonStyle(disabled || state.replacePreview === null || state.replacePreview.totalMatches === 0)}>
          <Check size={12} /> 应用
        </button>
      </div>
      <ReplaceStatus message={state.replaceMessage} preview={state.replacePreview} />
    </div>
  );
}

function ReplaceStatus(props: {
  readonly message: string;
  readonly preview: SearchReplacePreviewResult | null;
}) {
  if (props.preview === null && props.message === "") return null;
  return (
    <div style={replaceStatusStyle}>
      {props.message !== "" && <div>{props.message}</div>}
      {props.preview?.files.slice(0, PREVIEW_FILE_LIMIT).map((file) => (
        <div key={file.path} style={previewFileStyle}>{file.path} · {file.matches}</div>
      ))}
    </div>
  );
}

function SearchResults(props: {
  readonly grouped: ReadonlyMap<string, readonly SearchMatch[]>;
  readonly loading: boolean;
  readonly onOpen: (path: string, name: string, absolutePath: string) => void;
  readonly query: string;
}) {
  if (props.loading) return <ResultMessage text="搜索中..." />;
  if (props.query && props.grouped.size === 0) return <ResultMessage text="未找到结果" />;
  return (
    <div style={resultListStyle}>
      {[...props.grouped.entries()].map(([filePath, matches]) => (
        <MatchGroup filePath={filePath} key={filePath} matches={matches} onOpen={props.onOpen} />
      ))}
    </div>
  );
}

function MatchGroup(props: {
  readonly filePath: string;
  readonly matches: readonly SearchMatch[];
  readonly onOpen: (path: string, name: string, absolutePath: string) => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={fileHeaderStyle}><span style={countBadgeStyle}>{props.matches.length}</span>{props.filePath}</div>
      {props.matches.map((match, index) => <MatchRow filePath={props.filePath} key={`${props.filePath}-${match.line}-${index}`} match={match} onOpen={props.onOpen} />)}
    </div>
  );
}

function MatchRow(props: {
  readonly filePath: string;
  readonly match: SearchMatch;
  readonly onOpen: (path: string, name: string, absolutePath: string) => void;
}) {
  return (
    <div onClick={() => props.onOpen(props.filePath, props.filePath.split("/").pop() ?? props.filePath, props.filePath)} onMouseEnter={hoverRow} onMouseLeave={unhoverRow} style={matchRowStyle}>
      <span style={lineNumberStyle}>{props.match.line}</span>
      <span style={previewTextStyle}>{props.match.preview}</span>
    </div>
  );
}

function ResultMessage({ text }: { readonly text: string }) {
  return <div style={resultMessageStyle}>{text}</div>;
}

function IconButton(props: {
  readonly icon: React.ReactNode;
  readonly onClick: () => void;
  readonly style: React.CSSProperties;
}) {
  return <button onClick={props.onClick} style={props.style}>{props.icon}</button>;
}

async function runReplacePreview(options: Parameters<typeof useReplaceActions>[0]): Promise<void> {
  options.setReplaceBusy(true);
  options.setReplaceMessage("");
  try {
    const preview = await window.nexus.searchReplace.preview({ query: options.searchQuery, replacement: options.replaceText });
    options.setReplacePreview(preview);
    options.setReplaceMessage(`预览 ${preview.totalMatches} 处 · ${preview.files.length} 个文件`);
  } catch (error) {
    options.setReplaceMessage(formatError(error));
    options.setReplacePreview(null);
  } finally {
    options.setReplaceBusy(false);
  }
}

async function runReplaceApply(options: Parameters<typeof useReplaceActions>[0]): Promise<void> {
  options.setReplaceBusy(true);
  try {
    const result = await window.nexus.searchReplace.apply({ query: options.searchQuery, replacement: options.replaceText });
    options.setReplacePreview(null);
    options.setReplaceMessage(`已替换 ${result.totalMatches} 处 · ${result.filesChanged} 个文件`);
    await options.doSearch(options.searchQuery);
  } catch (error) {
    options.setReplaceMessage(formatError(error));
  } finally {
    options.setReplaceBusy(false);
  }
}

function changeSearch(event: React.ChangeEvent<HTMLInputElement>, state: ReturnType<typeof useSearchPanelState>): void {
  const value = event.target.value;
  state.setSearchQuery(value);
  state.setReplacePreview(null);
  if (state.debounceRef.current) clearTimeout(state.debounceRef.current);
  state.debounceRef.current = setTimeout(() => void state.doSearch(value), SEARCH_DELAY_MS);
}

function changeReplace(event: React.ChangeEvent<HTMLInputElement>, state: ReturnType<typeof useSearchPanelState>): void {
  state.setReplaceText(event.target.value);
  state.setReplacePreview(null);
  state.setReplaceMessage("");
}

function submitSearch(event: React.KeyboardEvent<HTMLInputElement>, state: ReturnType<typeof useSearchPanelState>): void {
  if (event.key !== "Enter") return;
  if (state.debounceRef.current) clearTimeout(state.debounceRef.current);
  void state.doSearch(state.searchQuery);
}

function groupMatches(matches: readonly SearchMatch[]): ReadonlyMap<string, readonly SearchMatch[]> {
  const grouped = new Map<string, SearchMatch[]>();
  for (const match of matches) grouped.set(match.path, [...grouped.get(match.path) ?? [], match]);
  return grouped;
}

function hoverRow(event: React.MouseEvent<HTMLDivElement>): void {
  event.currentTarget.style.background = "var(--bg-hover)";
}

function unhoverRow(event: React.MouseEvent<HTMLDivElement>): void {
  event.currentTarget.style.background = "";
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const panelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", height: "100%" };
const searchWrapStyle: React.CSSProperties = { alignItems: "center", display: "flex", gap: 4, padding: "0 12px 8px", position: "relative" };
const searchIconStyle: React.CSSProperties = { color: "var(--text-muted)", left: 20, position: "absolute", top: "50%", transform: "translateY(-50%)" };
const inputStyle: React.CSSProperties = { background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12, height: 30, outline: "none", paddingLeft: 28, paddingRight: 28, width: "100%" };
const clearButtonStyle: React.CSSProperties = { alignItems: "center", background: "none", border: "none", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer", display: "flex", height: 20, justifyContent: "center", position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 20 };
const replaceWrapStyle: React.CSSProperties = { borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6, padding: "0 12px 10px" };
const replaceRowStyle: React.CSSProperties = { alignItems: "center", display: "flex", gap: 6 };
const replaceInputStyle: React.CSSProperties = { ...inputStyle, height: 28, paddingLeft: 8, paddingRight: 8 };
const replaceActionStyle: React.CSSProperties = { display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" };
const replaceStatusStyle: React.CSSProperties = { color: "var(--text-muted)", display: "flex", flexDirection: "column", fontSize: 11, gap: 3 };
const previewFileStyle: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const resultListStyle: React.CSSProperties = { flex: 1, overflow: "auto", padding: "0 4px" };
const resultMessageStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12, padding: "12px 16px" };
const fileHeaderStyle: React.CSSProperties = { alignItems: "center", color: "var(--text-accent)", display: "flex", fontSize: 11, fontWeight: 600, gap: 4, padding: "4px 12px" };
const countBadgeStyle: React.CSSProperties = { background: "var(--accent-subtle)", borderRadius: 10, color: "var(--text-accent)", fontSize: 10, padding: "1px 6px" };
const matchRowStyle: React.CSSProperties = { alignItems: "flex-start", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.5, padding: "2px 12px 2px 24px", transition: "background 0.1s" };
const lineNumberStyle: React.CSSProperties = { color: "var(--text-muted)", flexShrink: 0, marginRight: 8, minWidth: 32, textAlign: "right" };
const previewTextStyle: React.CSSProperties = { color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

function buttonStyle(disabled: boolean): React.CSSProperties {
  return { alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", cursor: disabled ? "not-allowed" : "pointer", display: "flex", fontSize: 12, gap: 4, height: 28, justifyContent: "center", opacity: disabled ? 0.55 : 1 };
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return { ...buttonStyle(disabled), background: "var(--accent)", borderColor: "var(--accent)", color: "white" };
}
