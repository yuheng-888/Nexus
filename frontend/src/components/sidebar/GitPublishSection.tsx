import React, { useEffect, useMemo, useState } from "react";
import { GitBranch, ShieldCheck, UploadCloud } from "lucide-react";
import type { GitHubPublishRequest, GitPublishSafetyReport } from "../../types/git";
import type { GitPanelState } from "./gitPanelStateTypes";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  listStyle,
  metaStyle,
  primaryButtonStyle,
  rowStyle,
  sectionTitleStyle,
  stackStyle
} from "./gitPanelStyles";

interface GitPublishSectionProps {
  readonly state: GitPanelState;
}

interface PublishDraft {
  readonly authorEmail: string;
  readonly authorName: string;
  readonly branch: string;
  readonly commitMessage: string;
  readonly description: string;
  readonly name: string;
  readonly remoteName: string;
  readonly token: string;
  readonly visibility: "private" | "public";
}

export function GitPublishSection({ state }: GitPublishSectionProps) {
  const initialName = useMemo(() => workspaceName(state.workspaceRoot), [state.workspaceRoot]);
  const [draft, setDraft] = useState<PublishDraft>(() => initialDraft(initialName));
  const [report, setReport] = useState<GitPublishSafetyReport | null>(null);
  const disabled = state.action !== "" || state.loading;

  useEffect(() => {
    setDraft((current) => current.name === "" ? { ...current, name: initialName } : current);
  }, [initialName]);

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>发布到 GitHub</div>
      <div style={stackStyle}>
        <input onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="仓库名称" style={inputStyle} value={draft.name} />
        <input onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="仓库描述" style={inputStyle} value={draft.description} />
        <div style={rowStyle}>
          <input onChange={(event) => setDraft({ ...draft, branch: event.target.value })} placeholder="分支" style={inputStyle} value={draft.branch} />
          <input onChange={(event) => setDraft({ ...draft, remoteName: event.target.value })} placeholder="远端" style={inputStyle} value={draft.remoteName} />
        </div>
        <div style={rowStyle}>
          <select onChange={(event) => setDraft({ ...draft, visibility: event.target.value as PublishDraft["visibility"] })} style={selectStyle} value={draft.visibility}>
            <option value="public">公开</option>
            <option value="private">私有</option>
          </select>
          <input onChange={(event) => setDraft({ ...draft, commitMessage: event.target.value })} placeholder="提交信息" style={inputStyle} value={draft.commitMessage} />
        </div>
        <div style={rowStyle}>
          <input onChange={(event) => setDraft({ ...draft, authorName: event.target.value })} placeholder="Git 用户名" style={inputStyle} value={draft.authorName} />
          <input onChange={(event) => setDraft({ ...draft, authorEmail: event.target.value })} placeholder="Git 邮箱" style={inputStyle} value={draft.authorEmail} />
        </div>
        <input onChange={(event) => setDraft({ ...draft, token: event.target.value })} placeholder="GitHub Token" style={inputStyle} type="password" value={draft.token} />
        <div style={rowStyle}>
          <button disabled={disabled} onClick={() => void initRepository(state, draft.branch)} style={buttonState(buttonStyle, disabled)}>
            <GitBranch size={12} /> 初始化
          </button>
          <button disabled={disabled} onClick={() => void scanSafety(state, setReport)} style={buttonState(buttonStyle, disabled)}>
            <ShieldCheck size={12} /> 扫描
          </button>
          <button disabled={disabled || !canPublish(draft)} onClick={() => void publish(state, draft, setReport)} style={buttonState(primaryButtonStyle, disabled || !canPublish(draft))}>
            <UploadCloud size={12} /> 发布
          </button>
        </div>
        {report !== null && <SafetyReportView report={report} />}
      </div>
    </section>
  );
}

function SafetyReportView(props: { readonly report: GitPublishSafetyReport }) {
  const color = props.report.blocked ? "var(--error)" : "var(--text-accent)";
  return (
    <div style={listStyle}>
      <div style={{ ...metaStyle, color }}>扫描 {props.report.checkedFiles} 文件 · {props.report.findings.length} 风险</div>
      {props.report.findings.slice(0, 6).map((finding) => (
        <div key={`${finding.path}:${finding.message}`} style={metaStyle} title={finding.message}>
          {finding.path} · {finding.message}
        </div>
      ))}
    </div>
  );
}

async function initRepository(state: GitPanelState, branch: string): Promise<void> {
  await state.run("init", () => window.nexus.git.init({ branch }));
}

async function scanSafety(
  state: GitPanelState,
  setReport: (report: GitPublishSafetyReport | null) => void
): Promise<void> {
  await state.run("publishSafetyScan", async () => {
    const report = await window.nexus.git.publishSafetyScan();
    setReport(report);
    return { exitCode: report.blocked ? 1 : 0, stderr: report.blocked ? "发布扫描发现阻断项" : "", stdout: `扫描 ${report.checkedFiles} 文件` };
  });
}

async function publish(
  state: GitPanelState,
  draft: PublishDraft,
  setReport: (report: GitPublishSafetyReport | null) => void
): Promise<void> {
  await state.run("publishToGitHub", async () => {
    const result = await window.nexus.git.publishToGitHub(toRequest(draft));
    setReport(result.safety);
    return result;
  });
}

function toRequest(draft: PublishDraft): GitHubPublishRequest {
  return {
    authorEmail: optional(draft.authorEmail),
    authorName: optional(draft.authorName),
    branch: draft.branch,
    commitMessage: draft.commitMessage,
    description: optional(draft.description),
    name: draft.name,
    remoteName: draft.remoteName,
    token: draft.token,
    visibility: draft.visibility
  };
}

function canPublish(draft: PublishDraft): boolean {
  return draft.name.trim() !== "" && draft.token.trim() !== "";
}

function initialDraft(name: string): PublishDraft {
  return {
    authorEmail: "",
    authorName: "",
    branch: "main",
    commitMessage: "Initial publish",
    description: "",
    name,
    remoteName: "origin",
    token: "",
    visibility: "public"
  };
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function workspaceName(path: string | null): string {
  if (path === null) return "";
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  return disabled ? { ...style, cursor: "not-allowed", opacity: 0.55 } : style;
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 96
};
