import React, { useMemo, useState } from "react";
import { Download, GitBranch, GitCommit, GitPullRequest, Plus, Trash2, Upload } from "lucide-react";
import type { GitBranchItem, GitLogEntry, GitRemote } from "../../types/git";
import type { GitPanelState } from "./gitPanelStateTypes";
import { formatBranchMeta, formatGitLogMeta, formatRemoteSummary, sortGitBranches } from "./gitPanelModel";
import {
  buttonStyle,
  cardStyle,
  dangerButtonStyle,
  inputStyle,
  listStyle,
  metaPillStyle,
  metaStyle,
  primaryButtonStyle,
  rowStyle,
  sectionTitleStyle,
  stackStyle,
  titleStyle
} from "./gitPanelStyles";

interface GitRepositoryViewProps {
  readonly state: GitPanelState;
}

export function GitRepositoryView({ state }: GitRepositoryViewProps) {
  return (
    <>
      <BranchSection state={state} />
      <RemoteSection state={state} />
      <HistorySection log={state.log} onShow={state.showCommit} />
    </>
  );
}

function BranchSection({ state }: GitRepositoryViewProps) {
  const branches = useMemo(() => sortGitBranches(state.branches?.branches ?? []), [state.branches]);
  const [name, setName] = useState("");

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>分支</div>
      <div style={listStyle}>
        {branches.map((branch) => (
          <BranchRow branch={branch} key={branch.name} state={state} />
        ))}
      </div>
      <form onSubmit={(event) => submitBranch(event, state.createBranch, name, setName)} style={{ ...rowStyle, marginTop: 8 }}>
        <input onChange={(event) => setName(event.target.value)} placeholder="新分支名称" style={inputStyle} value={name} />
        <button disabled={name.trim() === ""} style={buttonState(primaryButtonStyle, name.trim() === "")}>
          <Plus size={12} /> 新建
        </button>
      </form>
    </section>
  );
}

function BranchRow(props: {
  readonly branch: GitBranchItem;
  readonly state: GitPanelState;
}) {
  const disabled = props.state.action !== "";
  const isCurrent = props.branch.current;

  return (
    <div style={rowStyle}>
      <GitBranch color={isCurrent ? "var(--text-accent)" : "var(--text-muted)"} size={13} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>{props.branch.name}</div>
        <div style={metaStyle}>{formatBranchMeta(props.branch)}</div>
      </div>
      {!isCurrent && (
        <>
          <button disabled={disabled} onClick={() => void props.state.checkoutBranch(props.branch.name)} style={buttonState(buttonStyle, disabled)}>
            切换
          </button>
          <button disabled={disabled} onClick={() => void props.state.deleteBranch(props.branch.name)} style={buttonState(dangerButtonStyle, disabled)} title="删除分支">
            <Trash2 size={12} />
          </button>
        </>
      )}
    </div>
  );
}

function RemoteSection({ state }: GitRepositoryViewProps) {
  const [draft, setDraft] = useState({ name: "", url: "" });

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>远端</div>
      <div style={listStyle}>
        {state.remotes.length === 0 ? <div style={metaStyle}>尚未配置远端</div> : state.remotes.map((remote) => (
          <RemoteRow key={remote.name} remote={remote} state={state} />
        ))}
      </div>
      <form onSubmit={(event) => submitRemote(event, state.addRemote, draft, setDraft)} style={{ ...stackStyle, marginTop: 8 }}>
        <input onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="remote 名称" style={inputStyle} value={draft.name} />
        <input onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="remote URL" style={inputStyle} value={draft.url} />
        <button disabled={!canSubmitRemote(draft)} style={buttonState(primaryButtonStyle, !canSubmitRemote(draft))}>
          <Plus size={12} /> 添加远端
        </button>
      </form>
    </section>
  );
}

function RemoteRow(props: {
  readonly remote: GitRemote;
  readonly state: GitPanelState;
}) {
  const disabled = props.state.action !== "";

  return (
    <div style={stackStyle}>
      <div style={rowStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>{props.remote.name}</div>
          <div style={metaStyle} title={formatRemoteSummary(props.remote)}>{props.remote.url}</div>
        </div>
        <button disabled={disabled} onClick={() => void props.state.removeRemote(props.remote.name)} style={buttonState(dangerButtonStyle, disabled)} title="移除远端">
          <Trash2 size={12} />
        </button>
      </div>
      <div style={rowStyle}>
        <button disabled={disabled} onClick={() => void props.state.fetchRemote(props.remote.name)} style={buttonState(buttonStyle, disabled)}>
          <Download size={12} /> Fetch
        </button>
        <button disabled={disabled} onClick={() => void props.state.pullRemote(props.remote.name)} style={buttonState(buttonStyle, disabled)}>
          <GitPullRequest size={12} /> Pull
        </button>
        <button disabled={disabled} onClick={() => void props.state.pushRemote(props.remote.name)} style={buttonState(buttonStyle, disabled)}>
          <Upload size={12} /> Push
        </button>
      </div>
    </div>
  );
}

function HistorySection(props: {
  readonly log: readonly GitLogEntry[];
  readonly onShow: (ref: string) => Promise<void>;
}) {
  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>历史</div>
      <div style={listStyle}>
        {props.log.length === 0 ? <div style={metaStyle}>暂无提交记录</div> : props.log.map((entry) => (
          <button key={entry.hash} onClick={() => void props.onShow(entry.hash)} style={historyButtonStyle}>
            <GitCommit color="var(--text-muted)" size={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={titleStyle}>{entry.subject}</div>
              <div style={metaStyle}>{formatGitLogMeta(entry)}</div>
            </div>
            <span style={metaPillStyle}>show</span>
          </button>
        ))}
      </div>
    </section>
  );
}

async function submitBranch(
  event: React.FormEvent<HTMLFormElement>,
  createBranch: (name: string) => Promise<void>,
  name: string,
  setName: (name: string) => void
): Promise<void> {
  event.preventDefault();
  if (name.trim() === "") return;
  await createBranch(name);
  setName("");
}

async function submitRemote(
  event: React.FormEvent<HTMLFormElement>,
  addRemote: (name: string, url: string) => Promise<void>,
  draft: { readonly name: string; readonly url: string },
  setDraft: (draft: { readonly name: string; readonly url: string }) => void
): Promise<void> {
  event.preventDefault();
  if (!canSubmitRemote(draft)) return;
  await addRemote(draft.name, draft.url);
  setDraft({ name: "", url: "" });
}

function canSubmitRemote(draft: { readonly name: string; readonly url: string }): boolean {
  return draft.name.trim() !== "" && draft.url.trim() !== "";
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;

  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}

const historyButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: "auto",
  justifyContent: "flex-start",
  padding: "6px",
  textAlign: "left",
  width: "100%"
};
