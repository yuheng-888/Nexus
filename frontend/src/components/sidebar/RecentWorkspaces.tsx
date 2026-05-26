import { workspaceNameFromPath } from "./fileExplorerHelpers";
import {
  emptyPanelStyle,
  errorStyle,
  primaryButtonStyle,
  recentButtonStyle,
  recentPathStyle,
  recentTitleStyle,
  sectionLabelStyle
} from "./fileExplorerStyles";

interface EmptyWorkspaceProps {
  readonly error: string;
  readonly loading: boolean;
  readonly onOpenRecent: (root: string) => void;
  readonly onOpenWorkspace: () => void;
  readonly recentWorkspaces: readonly string[];
}

interface RecentWorkspaceListProps {
  readonly loading: boolean;
  readonly onOpenRecent: (root: string) => void;
  readonly recentWorkspaces: readonly string[];
}

export function EmptyWorkspace(props: EmptyWorkspaceProps) {
  return (
    <div style={emptyPanelStyle}>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
        尚未打开项目
      </div>
      <button onClick={props.onOpenWorkspace} style={primaryButtonStyle}>
        打开项目
      </button>
      <RecentWorkspaceList
        loading={props.loading}
        onOpenRecent={props.onOpenRecent}
        recentWorkspaces={props.recentWorkspaces}
      />
      {props.error !== "" && <div style={errorStyle}>{props.error}</div>}
    </div>
  );
}

function RecentWorkspaceList(props: RecentWorkspaceListProps) {
  if (props.loading) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>正在读取最近项目...</div>;
  }

  if (props.recentWorkspaces.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={sectionLabelStyle}>最近项目</div>
      {props.recentWorkspaces.map((root) => (
        <button key={root} onClick={() => props.onOpenRecent(root)} style={recentButtonStyle}>
          <span style={recentTitleStyle}>{workspaceNameFromPath(root)}</span>
          <span style={recentPathStyle}>{root}</span>
        </button>
      ))}
    </div>
  );
}
