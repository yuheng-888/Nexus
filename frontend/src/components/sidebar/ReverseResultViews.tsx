import type React from "react";
import type {
  ReverseAnalysisFinding,
  ReverseAnalysisResult,
  ReverseAsarDiffResult,
  ReverseAsarExtractResult,
  ReverseAsarInspectResult,
  ReverseAsarPackResult,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreResult,
  ReverseTargetDetection
} from "../../types/reverse";
import type { EditorLocation } from "../editor/editorNavigation";
import {
  asarDiffEntryMeta,
  asarDiffSummary,
  asarEntryMeta,
  asarInspectSummary,
  reverseAnalysisSummary,
  reverseFindingEditorLocation,
  reverseFindingLocation,
  reverseSeverityCounts,
  reverseSeverityLabel,
  reverseTargetTypeLabel,
  topAsarDiffEntries,
  topAsarEntries
} from "./reversePanelModel";
import {
  badgeStyle,
  secondaryButtonStyle,
  emptyStyle,
  findingStyle,
  listStyle,
  messageStyle,
  metaStyle,
  splitRowStyle,
  titleStyle
} from "./reversePanelStyles";

export function TargetSummary({ target }: { readonly target: ReverseTargetDetection }) {
  return (
    <div style={messageStyle}>
      <div style={splitRowStyle}>
        <span style={titleStyle}>{target.name}</span>
        <span style={badgeStyle}>{reverseTargetTypeLabel(target.type)}</span>
      </div>
      <div style={metaStyle}>{target.absolutePath}</div>
      <div style={metaStyle}>{target.signals.join(" · ") || "无识别信号"}</div>
    </div>
  );
}

export function AnalysisSummary(props: {
  readonly onOpenFinding?: (location: EditorLocation) => Promise<void>;
  readonly result: ReverseAnalysisResult | null;
}) {
  if (props.result === null) return <div style={metaStyle}>{reverseAnalysisSummary(null)}</div>;
  const counts = reverseSeverityCounts(props.result.findings);
  return (
    <div style={listStyle}>
      <div style={metaStyle}>{reverseAnalysisSummary(props.result)} · 严重 {counts.critical} · 警告 {counts.warning} · 信息 {counts.info}</div>
      {props.result.findings.slice(0, 5).map((finding) => (
        <FindingRow
          finding={finding}
          key={`${finding.path}:${finding.line}:${finding.message}`}
          onOpen={props.onOpenFinding}
        />
      ))}
    </div>
  );
}

export function AsarResults(props: {
  readonly diff: ReverseAsarDiffResult | null;
  readonly extract: ReverseAsarExtractResult | null;
  readonly inspect: ReverseAsarInspectResult | null;
  readonly onReveal: (path: string) => Promise<void>;
  readonly pack: ReverseAsarPackResult | null;
}) {
  return (
    <div style={listStyle}>
      <div style={metaStyle}>{asarInspectSummary(props.inspect)}</div>
      <AsarOutputList extract={props.extract} onReveal={props.onReveal} pack={props.pack} />
      <AsarEntryList inspect={props.inspect} />
      <div style={metaStyle}>{asarDiffSummary(props.diff)}</div>
      <AsarDiffList diff={props.diff} />
    </div>
  );
}

export function HookMeta(props: {
  readonly generate: ReverseJsHookGenerateResult | null;
  readonly inject: ReverseJsHookInjectResult | null;
  readonly onReveal: (path: string) => Promise<void>;
  readonly restore: ReverseJsHookRestoreResult | null;
}) {
  return (
    <div style={listStyle}>
      <RevealRow label="hook" onReveal={props.onReveal} path={props.generate?.hookPath ?? null} placeholder="尚未生成 hook" />
      {props.inject !== null && <RevealRow label="备份" onReveal={props.onReveal} path={props.inject.backupPath} />}
      {props.restore !== null && <div style={metaStyle}>已恢复: {String(props.restore.restored)}</div>}
    </div>
  );
}

function AsarOutputList(props: {
  readonly extract: ReverseAsarExtractResult | null;
  readonly onReveal: (path: string) => Promise<void>;
  readonly pack: ReverseAsarPackResult | null;
}) {
  if (props.extract === null && props.pack === null) return null;
  return (
    <div style={listStyle}>
      <RevealRow label="解包目录" onReveal={props.onReveal} path={props.extract?.destinationPath ?? null} />
      <RevealRow label="打包文件" onReveal={props.onReveal} path={props.pack?.archivePath ?? null} />
    </div>
  );
}

function AsarEntryList({ inspect }: { readonly inspect: ReverseAsarInspectResult | null }) {
  if (inspect === null) return null;
  if (inspect.entries.length === 0) return <div style={emptyStyle}>ASAR 中没有条目</div>;
  return (
    <div style={listStyle}>
      {topAsarEntries(inspect.entries).map((entry) => (
        <ResultRow key={entry.path} meta={asarEntryMeta(entry)} title={entry.path} />
      ))}
    </div>
  );
}

function AsarDiffList({ diff }: { readonly diff: ReverseAsarDiffResult | null }) {
  if (diff === null) return null;
  if (diff.entries.length === 0) return <div style={emptyStyle}>ASAR 没有差异</div>;
  return (
    <div style={listStyle}>
      {topAsarDiffEntries(diff.entries).map((entry) => (
        <ResultRow key={`${entry.change}:${entry.path}`} meta={asarDiffEntryMeta(entry)} title={entry.path} />
      ))}
    </div>
  );
}

function FindingRow(props: {
  readonly finding: ReverseAnalysisFinding;
  readonly onOpen?: (location: EditorLocation) => Promise<void>;
}) {
  const content = (
    <>
      <div style={splitRowStyle}>
        <span style={titleStyle}>{props.finding.message}</span>
        <span style={badgeStyle}>{reverseSeverityLabel(props.finding.severity)}</span>
      </div>
      <div style={metaStyle}>{reverseFindingLocation(props.finding)} · {props.finding.type}</div>
      {props.finding.snippet.trim() !== "" && <pre style={snippetStyle}>{props.finding.snippet.trim()}</pre>}
    </>
  );

  if (props.onOpen === undefined) return <div style={findingStyle}>{content}</div>;

  return (
    <button onClick={() => void props.onOpen?.(reverseFindingEditorLocation(props.finding))} style={findingButtonStyle}>
      {content}
    </button>
  );
}

function ResultRow(props: { readonly meta: string; readonly title: string }) {
  return (
    <div style={findingStyle}>
      <div style={titleStyle}>{props.title}</div>
      <div style={metaStyle}>{props.meta}</div>
    </div>
  );
}

function RevealRow(props: {
  readonly label: string;
  readonly onReveal: (path: string) => Promise<void>;
  readonly path: string | null;
  readonly placeholder?: string;
}) {
  if (props.path === null) {
    return props.placeholder === undefined ? null : <div style={metaStyle}>{props.placeholder}</div>;
  }

  return (
    <div style={revealRowStyle}>
      <div style={metaStyle}>{props.label}: {props.path}</div>
      <button onClick={() => void props.onReveal(props.path ?? "")} style={secondaryButtonStyle}>
        定位
      </button>
    </div>
  );
}

const snippetStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  lineHeight: 1.45,
  margin: 0,
  overflow: "auto",
  padding: 6,
  whiteSpace: "pre-wrap"
};

const findingButtonStyle: React.CSSProperties = {
  ...findingStyle,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  width: "100%"
};

const revealRowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: 6,
  gridTemplateColumns: "minmax(0, 1fr) auto"
};
