import React, { useMemo, useState } from "react";
import { Bookmark, GitMerge, GitPullRequest, Layers, Plus, Trash2, Upload } from "lucide-react";
import type { GitBranchItem, GitStashEntry } from "../../types/git";
import { formatBranchMeta, sortGitBranches } from "./gitPanelModel";
import { formatStashMeta, latestTags, normalizeGitRefInput } from "./gitAdvancedModel";
import type { GitPanelState } from "./gitPanelStateTypes";
import {
  buttonStyle,
  cardStyle,
  dangerButtonStyle,
  inputStyle,
  listStyle,
  metaStyle,
  primaryButtonStyle,
  rowStyle,
  sectionTitleStyle,
  stackStyle,
  titleStyle
} from "./gitPanelStyles";

interface GitAdvancedViewProps {
  readonly state: GitPanelState;
}

export function GitAdvancedView({ state }: GitAdvancedViewProps) {
  return (
    <>
      <StashSection state={state} />
      <BranchOperationSection state={state} />
      <TagSection state={state} />
    </>
  );
}

function StashSection({ state }: GitAdvancedViewProps) {
  const [draft, setDraft] = useState({ includeUntracked: false, message: "" });
  const disabled = state.action !== "";

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>Stash</div>
      <form onSubmit={(event) => submitStash(event, draft, state.stashPush, setDraft)} style={stackStyle}>
        <input onChange={(event) => setDraft({ ...draft, message: event.target.value })} placeholder="stash 信息" style={inputStyle} value={draft.message} />
        <label style={checkboxRowStyle}>
          <input checked={draft.includeUntracked} onChange={(event) => setDraft({ ...draft, includeUntracked: event.target.checked })} type="checkbox" />
          包含未跟踪文件
        </label>
        <button disabled={disabled} style={buttonState(primaryButtonStyle, disabled)}>
          <Upload size={12} /> 保存 Stash
        </button>
      </form>
      <StashList disabled={disabled} state={state} stashes={state.stashes} />
    </section>
  );
}

function StashList(props: {
  readonly disabled: boolean;
  readonly stashes: readonly GitStashEntry[];
  readonly state: GitPanelState;
}) {
  if (props.stashes.length === 0) return <div style={{ ...metaStyle, marginTop: 8 }}>暂无 stash</div>;

  return (
    <div style={{ ...listStyle, marginTop: 8 }}>
      {props.stashes.map((stash) => (
        <div key={stash.ref} style={stackStyle}>
          <div style={rowStyle}>
            <Layers color="var(--text-muted)" size={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={titleStyle}>{stash.message}</div>
              <div style={metaStyle}>{formatStashMeta(stash)}</div>
            </div>
          </div>
          <div style={rowStyle}>
            <button disabled={props.disabled} onClick={() => void props.state.stashApply(stash.ref)} style={buttonState(buttonStyle, props.disabled)}>Apply</button>
            <button disabled={props.disabled} onClick={() => void props.state.stashPop(stash.ref)} style={buttonState(buttonStyle, props.disabled)}>Pop</button>
            <button disabled={props.disabled} onClick={() => void props.state.stashDrop(stash.ref)} style={buttonState(dangerButtonStyle, props.disabled)}>
              <Trash2 size={12} /> Drop
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BranchOperationSection({ state }: GitAdvancedViewProps) {
  const branches = useMemo(() => mergeTargets(state.branches?.branches ?? []), [state.branches]);
  const [target, setTarget] = useState("");
  const disabled = state.action !== "" || normalizeGitRefInput(target) === "";

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>Merge / Rebase</div>
      <div style={stackStyle}>
        <select onChange={(event) => setTarget(event.target.value)} style={inputStyle} value={target}>
          <option value="">选择分支或输入 ref</option>
          {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
        </select>
        <input onChange={(event) => setTarget(event.target.value)} placeholder="目标 ref" style={inputStyle} value={target} />
        <div style={rowStyle}>
          <button disabled={disabled} onClick={() => void state.mergeBranch(normalizeGitRefInput(target))} style={buttonState(primaryButtonStyle, disabled)}>
            <GitMerge size={12} /> Merge
          </button>
          <button disabled={disabled} onClick={() => void state.rebaseBranch(normalizeGitRefInput(target))} style={buttonState(buttonStyle, disabled)}>
            <GitPullRequest size={12} /> Rebase
          </button>
        </div>
        <div style={rowStyle}>
          <button disabled={state.action !== ""} onClick={() => void state.abortMerge()} style={buttonState(dangerButtonStyle, state.action !== "")}>Abort merge</button>
          <button disabled={state.action !== ""} onClick={() => void state.abortRebase()} style={buttonState(dangerButtonStyle, state.action !== "")}>Abort rebase</button>
        </div>
        {branches.slice(0, 3).map((branch) => <div key={branch.name} style={metaStyle}>{branch.name} · {formatBranchMeta(branch)}</div>)}
      </div>
    </section>
  );
}

function TagSection({ state }: GitAdvancedViewProps) {
  const [draft, setDraft] = useState({ message: "", name: "" });
  const disabled = state.action !== "";
  const nameEmpty = normalizeGitRefInput(draft.name) === "";
  const tags = latestTags(state.tags, 8);

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>Tags</div>
      <form onSubmit={(event) => submitTag(event, draft, state.createTag, setDraft)} style={stackStyle}>
        <input onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="tag 名称" style={inputStyle} value={draft.name} />
        <input onChange={(event) => setDraft({ ...draft, message: event.target.value })} placeholder="tag message，可选" style={inputStyle} value={draft.message} />
        <button disabled={disabled || nameEmpty} style={buttonState(primaryButtonStyle, disabled || nameEmpty)}>
          <Plus size={12} /> 创建 Tag
        </button>
      </form>
      <TagList disabled={disabled} onDelete={state.deleteTag} onShow={state.showCommit} tags={tags} />
    </section>
  );
}

function TagList(props: {
  readonly disabled: boolean;
  readonly onDelete: (tag: string) => Promise<void>;
  readonly onShow: (tag: string) => Promise<void>;
  readonly tags: readonly string[];
}) {
  if (props.tags.length === 0) return <div style={{ ...metaStyle, marginTop: 8 }}>暂无 tag</div>;

  return (
    <div style={{ ...listStyle, marginTop: 8 }}>
      {props.tags.map((tag) => (
        <div key={tag} style={rowStyle}>
          <Bookmark color="var(--text-muted)" size={13} />
          <span style={titleStyle}>{tag}</span>
          <button disabled={props.disabled} onClick={() => void props.onShow(tag)} style={buttonState(buttonStyle, props.disabled)}>Show</button>
          <button disabled={props.disabled} onClick={() => void props.onDelete(tag)} style={buttonState(dangerButtonStyle, props.disabled)} title="删除 tag">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

async function submitStash(
  event: React.FormEvent<HTMLFormElement>,
  draft: { readonly includeUntracked: boolean; readonly message: string },
  stashPush: (message?: string, includeUntracked?: boolean) => Promise<void>,
  setDraft: (draft: { readonly includeUntracked: boolean; readonly message: string }) => void
): Promise<void> {
  event.preventDefault();
  await stashPush(optionalText(draft.message), draft.includeUntracked);
  setDraft({ includeUntracked: false, message: "" });
}

async function submitTag(
  event: React.FormEvent<HTMLFormElement>,
  draft: { readonly message: string; readonly name: string },
  createTag: (name: string, message?: string) => Promise<void>,
  setDraft: (draft: { readonly message: string; readonly name: string }) => void
): Promise<void> {
  event.preventDefault();
  const name = normalizeGitRefInput(draft.name);
  if (name === "") return;
  await createTag(name, optionalText(draft.message));
  setDraft({ message: "", name: "" });
}

function mergeTargets(branches: readonly GitBranchItem[]): readonly GitBranchItem[] {
  return sortGitBranches(branches).filter((branch) => !branch.current);
}

function optionalText(value: string): string | undefined {
  const trimmed = normalizeGitRefInput(value);
  return trimmed === "" ? undefined : trimmed;
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;

  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}

const checkboxRowStyle: React.CSSProperties = {
  alignItems: "center",
  color: "var(--text-secondary)",
  display: "flex",
  fontSize: 11,
  gap: 6
};
