import { AlertCircle, GitBranch, Loader2, RefreshCw } from "lucide-react";
import type { GitSummary } from "../../types/git";
import { GitAdvancedView } from "./GitAdvancedView";
import { gitEmptyStateText, shouldRefreshGitPanel } from "./gitPanelModel";
import { GitPublishSection } from "./GitPublishSection";
import { GitPullRequestSection } from "./GitPullRequestSection";
import { GitRepositoryView } from "./GitRepositoryView";
import { GitWorktreeView } from "./GitWorktreeView";
import { useGitPanelState } from "./useGitPanelState";
import {
  bodyStyle,
  branchStyle,
  branchTextStyle,
  emptyStyle,
  errorStyle,
  headerStyle,
  iconButtonStyle,
  metaPillStyle,
  outputStyle,
  panelStyle
} from "./gitPanelStyles";

export function GitPanel() {
  const state = useGitPanelState();

  return (
    <div style={panelStyle}>
      <Header loading={state.loading} onRefresh={state.refresh} summary={state.summary} workspaceRoot={state.workspaceRoot} />
      {state.error !== "" && <Message icon={<AlertCircle size={13} />} style={errorStyle} text={state.error} />}
      {state.commandOutput !== "" && <pre style={outputStyle}>{state.commandOutput}</pre>}
      <GitBody state={state} />
    </div>
  );
}

function Header(props: {
  readonly loading: boolean;
  readonly onRefresh: () => Promise<void>;
  readonly summary: GitSummary | null;
  readonly workspaceRoot: string | null;
}) {
  const branch = props.summary?.branch.current || "Git";
  const ahead = props.summary?.branch.ahead ?? 0;
  const behind = props.summary?.branch.behind ?? 0;
  const refreshDisabled = props.loading || !shouldRefreshGitPanel(props.workspaceRoot);

  return (
    <div style={headerStyle}>
      <div style={branchStyle}>
        <GitBranch size={13} />
        <span style={branchTextStyle}>{branch}</span>
        {ahead > 0 && <span style={metaPillStyle}>↑{ahead}</span>}
        {behind > 0 && <span style={metaPillStyle}>↓{behind}</span>}
      </div>
      <button disabled={refreshDisabled} onClick={() => void props.onRefresh()} style={iconButtonStyle} title="刷新 Git 状态">
        {props.loading ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
      </button>
    </div>
  );
}

function GitBody({ state }: { readonly state: ReturnType<typeof useGitPanelState> }) {
  if (state.summary === null) {
    return <div style={emptyStyle}>{gitEmptyStateText({ repository: true, stderr: "", workspaceRoot: state.workspaceRoot })}</div>;
  }

  if (!state.summary.repository) {
    return (
      <div style={bodyStyle}>
        <GitPublishSection state={state} />
        <div style={emptyStyle}>{gitEmptyStateText({
          repository: false,
          stderr: state.summary.raw.stderr,
          workspaceRoot: state.workspaceRoot
        })}</div>
      </div>
    );
  }

  return (
    <div style={bodyStyle}>
      <GitPublishSection state={state} />
      <GitRepositoryView state={state} />
      <GitPullRequestSection state={state} />
      <GitWorktreeView state={state} />
      <GitAdvancedView state={state} />
    </div>
  );
}

function Message(props: {
  readonly icon: React.ReactNode;
  readonly style: React.CSSProperties;
  readonly text: string;
}) {
  return <div style={props.style}>{props.icon}{props.text}</div>;
}
