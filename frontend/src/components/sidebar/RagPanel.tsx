import React from "react";
import {
  AlertCircle,
  Database,
  Eraser,
  FileCode2,
  Loader2,
  RefreshCw,
  Search
} from "lucide-react";
import { useFileTree } from "../../hooks/useFileTree";
import type { RagIndexSummary, RagIndexStatus, RagSearchResult } from "../../types/rag";
import {
  formatRagBuiltAt,
  formatRagResultLocation,
  ragStatusText,
  summarizeRagResult
} from "./ragPanelModel";
import {
  cardStyle,
  emptyStyle,
  errorStyle,
  headerStyle,
  iconButtonStyle,
  inputStyle,
  metaStyle,
  panelStyle,
  primaryButtonStyle,
  resultButtonStyle,
  rowStyle,
  titleStyle
} from "./ragPanelStyles";
import { useRagPanelState } from "./useRagPanelState";

export function RagPanel() {
  const state = useRagPanelState();
  const { openFileByEntry } = useFileTree();
  const busy = state.action !== "";
  const canUseIndex = state.workspaceRoot !== null;

  const openResult = async (result: RagSearchResult) => {
    await openFileByEntry(result.path, result.path.split("/").pop() ?? result.path, absolutePath(state.workspaceRoot, result.path));
  };

  return (
    <div style={panelStyle}>
      <PanelHeader busy={busy} onRefresh={state.refresh} />
      {state.error !== "" && <ErrorBox message={state.error} />}
      <StatusCard
        action={state.action}
        canUseIndex={canUseIndex}
        lastBuild={state.lastBuild}
        onBuild={state.buildIndex}
        onClear={state.clearIndex}
        status={state.status}
      />
      <SearchBox
        busy={state.action === "search"}
        disabled={!canUseIndex}
        onQuery={state.setQuery}
        onSearch={state.search}
        query={state.query}
      />
      <ResultList onOpen={openResult} results={state.results} />
    </div>
  );
}

function PanelHeader(props: { readonly busy: boolean; readonly onRefresh: () => Promise<void> }) {
  return (
    <div style={headerStyle}>
      <span>代码库索引</span>
      <button disabled={props.busy} onClick={() => void props.onRefresh()} style={buttonStyle(iconButtonStyle, props.busy)} title="刷新索引状态">
        {props.busy ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
      </button>
    </div>
  );
}

function StatusCard(props: {
  readonly action: string;
  readonly canUseIndex: boolean;
  readonly lastBuild: RagIndexSummary | null;
  readonly onBuild: () => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly status: RagIndexStatus | null;
}) {
  const busy = props.action !== "";
  const clearDisabled = busy || props.status?.indexed !== true;

  return (
    <section style={cardStyle}>
      <div style={rowStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={titleStyle}>{ragStatusText(props.status)}</div>
          <div style={metaStyle}>构建时间: {formatRagBuiltAt(props.status?.builtAt)}</div>
          <div style={metaStyle} title={props.status?.indexPath}>索引文件: {props.status?.indexPath || "尚未分配"}</div>
        </div>
        <Database color="var(--text-accent)" size={18} />
      </div>
      <div style={{ ...rowStyle, justifyContent: "flex-start", marginTop: 10 }}>
        <button disabled={busy || !props.canUseIndex} onClick={() => void props.onBuild()} style={buttonStyle(primaryButtonStyle, busy || !props.canUseIndex)}>
          {props.action === "build" ? <Loader2 className="animate-spin" size={12} /> : <Database size={12} />}
          构建
        </button>
        <button disabled={clearDisabled} onClick={() => void props.onClear()} style={buttonStyle(iconButtonStyle, clearDisabled)}>
          <Eraser size={12} />
          清空
        </button>
      </div>
      {props.lastBuild !== null && <BuildSummary summary={props.lastBuild} />}
    </section>
  );
}

function BuildSummary({ summary }: { readonly summary: RagIndexSummary }) {
  if (summary.skippedFiles.length === 0) return null;

  return (
    <div style={{ ...metaStyle, marginTop: 8 }}>
      跳过 {summary.skippedFiles.length} 个文件，第一项: {summary.skippedFiles[0]?.path}
    </div>
  );
}

function SearchBox(props: {
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onQuery: (query: string) => void;
  readonly onSearch: () => Promise<void>;
  readonly query: string;
}) {
  const empty = props.query.trim() === "";

  return (
    <form onSubmit={(event) => submitSearch(event, props.onSearch)} style={cardStyle}>
      <div style={{ position: "relative" }}>
        <Search color="var(--text-muted)" size={13} style={searchIconStyle} />
        <input
          disabled={props.disabled}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="搜索代码语义或符号"
          style={{ ...inputStyle, paddingLeft: 28 }}
          value={props.query}
        />
      </div>
      <button disabled={props.disabled || props.busy || empty} style={buttonStyle(primaryButtonStyle, props.disabled || props.busy || empty)}>
        {props.busy ? <Loader2 className="animate-spin" size={12} /> : <Search size={12} />}
        检索
      </button>
    </form>
  );
}

function ResultList(props: {
  readonly onOpen: (result: RagSearchResult) => Promise<void>;
  readonly results: readonly RagSearchResult[];
}) {
  if (props.results.length === 0) return <div style={emptyStyle}>暂无检索结果</div>;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {props.results.map((result) => (
        <button key={`${result.path}:${result.startLine}`} onClick={() => void props.onOpen(result)} style={resultButtonStyle}>
          <div style={{ ...rowStyle, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={titleStyle}>{formatRagResultLocation(result)}</div>
              <div style={metaStyle}>{summarizeRagResult(result)}</div>
            </div>
            <FileCode2 color="var(--text-muted)" size={15} />
          </div>
        </button>
      ))}
    </div>
  );
}

function ErrorBox({ message }: { readonly message: string }) {
  return (
    <div style={errorStyle}>
      <AlertCircle size={13} /> {message}
    </div>
  );
}

function submitSearch(event: React.FormEvent<HTMLFormElement>, onSearch: () => Promise<void>): void {
  event.preventDefault();
  void onSearch();
}

function buttonStyle(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;

  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}

function absolutePath(workspaceRoot: string | null, path: string): string {
  return workspaceRoot === null ? path : `${workspaceRoot}/${path}`;
}

const searchIconStyle: React.CSSProperties = {
  left: 8,
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)"
};
