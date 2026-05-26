import type React from "react";
import { FileDiff, GitCommit, Minus, Plus } from "lucide-react";
import type { GitDiffResult, GitFileChange } from "../../types/git";
import type { DiffSelection, GitPanelState } from "./gitPanelStateTypes";
import { gitChangeStatusLabel } from "./gitPanelModel";
import {
  buttonStyle,
  cardStyle,
  diffStyle,
  emptyStyle,
  fileButtonStyle,
  iconButtonStyle,
  listStyle,
  pathStyle,
  primaryButtonStyle,
  rowStyle,
  sectionTitleStyle,
  textareaStyle
} from "./gitPanelStyles";

interface GitWorktreeViewProps {
  readonly state: GitPanelState;
}

export function GitWorktreeView({ state }: GitWorktreeViewProps) {
  return (
    <>
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>工作区</div>
        <Toolbar action={state.action} onRun={state.run} />
        <ChangeList state={state} />
        <CommitBox message={state.commitMessage} onCommit={state.commit} onMessage={state.setCommitMessage} />
      </section>
      <DiffBox diff={state.diff} selected={state.selected} />
    </>
  );
}

function Toolbar(props: {
  readonly action: string;
  readonly onRun: (label: string, task: () => Promise<unknown>) => Promise<void>;
}) {
  const disabled = props.action !== "";

  return (
    <div style={{ ...rowStyle, marginBottom: 8 }}>
      <button disabled={disabled} onClick={() => void props.onRun("stageAll", () => window.nexus.git.stageAll())} style={buttonState(buttonStyle, disabled)}>
        <Plus size={12} /> 全部暂存
      </button>
      <button disabled={disabled} onClick={() => void props.onRun("unstageAll", () => window.nexus.git.unstageAll())} style={buttonState(buttonStyle, disabled)}>
        <Minus size={12} /> 全部取消
      </button>
    </div>
  );
}

function ChangeList({ state }: GitWorktreeViewProps) {
  if (state.summary === null) return <div style={emptyStyle}>加载 Git 状态...</div>;
  if (state.summary.changes.length === 0) return <div style={emptyStyle}>工作区干净</div>;

  return (
    <div style={listStyle}>
      <ChangeSection changes={state.summary.staged} onChoose={state.choose} onRun={state.run} staged title="已暂存" />
      <ChangeSection changes={state.summary.unstaged} onChoose={state.choose} onRun={state.run} title="未暂存" />
      <ChangeSection changes={state.summary.untracked} onChoose={state.choose} onRun={state.run} title="未跟踪" />
    </div>
  );
}

function ChangeSection(props: {
  readonly changes: readonly GitFileChange[];
  readonly onChoose: (path: string, staged: boolean) => Promise<void>;
  readonly onRun: (label: string, task: () => Promise<unknown>) => Promise<void>;
  readonly staged?: boolean;
  readonly title: string;
}) {
  if (props.changes.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div style={sectionTitleStyle}>{props.title} · {props.changes.length}</div>
      {props.changes.map((change) => (
        <ChangeRow change={change} key={`${props.title}-${change.path}`} onChoose={props.onChoose} onRun={props.onRun} staged={props.staged === true} />
      ))}
    </div>
  );
}

function ChangeRow(props: {
  readonly change: GitFileChange;
  readonly onChoose: (path: string, staged: boolean) => Promise<void>;
  readonly onRun: (label: string, task: () => Promise<unknown>) => Promise<void>;
  readonly staged: boolean;
}) {
  return (
    <div style={rowStyle}>
      <button onClick={() => void props.onChoose(props.change.path, props.staged)} style={fileButtonStyle} title="查看 diff">
        <FileDiff size={12} />
        <span style={pathStyle}>{props.change.path}</span>
        <span style={statusStyle(props.change)}>{gitChangeStatusLabel(props.change)}</span>
      </button>
      <button
        onClick={() => void props.onRun(props.staged ? "unstage" : "stage", () => {
          return props.staged ? window.nexus.git.unstage(props.change.path) : window.nexus.git.stage(props.change.path);
        })}
        style={iconButtonStyle}
        title={props.staged ? "取消暂存" : "暂存"}
      >
        {props.staged ? <Minus size={12} /> : <Plus size={12} />}
      </button>
    </div>
  );
}

function CommitBox(props: {
  readonly message: string;
  readonly onCommit: () => Promise<void>;
  readonly onMessage: (message: string) => void;
}) {
  const disabled = props.message.trim() === "";

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <textarea
        onChange={(event) => props.onMessage(event.target.value)}
        placeholder="提交信息"
        style={textareaStyle}
        value={props.message}
      />
      <button disabled={disabled} onClick={() => void props.onCommit()} style={buttonState(primaryButtonStyle, disabled)}>
        <GitCommit size={13} /> 提交
      </button>
    </div>
  );
}

function DiffBox(props: {
  readonly diff: GitDiffResult | null;
  readonly selected: DiffSelection | null;
}) {
  if (props.selected === null) return null;
  const text = props.diff?.stdout.trimEnd() || "没有可显示的 diff";

  return <pre style={diffStyle}>{text}</pre>;
}

function statusStyle(change: GitFileChange): React.CSSProperties {
  const color = statusColor(change);
  return {
    background: `${color}20`,
    borderRadius: "var(--radius-sm)",
    color,
    fontSize: 10,
    fontWeight: 700,
    minWidth: 18,
    padding: "1px 5px",
    textAlign: "center"
  };
}

function statusColor(change: GitFileChange): string {
  if (change.untracked) return "var(--info)";
  if (change.status === "added") return "var(--success)";
  if (change.status === "deleted") return "var(--error)";
  if (change.status === "renamed" || change.status === "copied") return "var(--text-accent)";

  return "var(--warning)";
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;

  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}
