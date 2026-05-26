import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useLanguageStore } from "../../store/languageStore";
import { useFileTree } from "../../hooks/useFileTree";
import type { DirectoryEntry } from "../../types/nexus";
import { FileTreeItem } from "./FileTreeItem";
import { EmptyWorkspace } from "./RecentWorkspaces";
import { sortDirectoryEntries } from "./fileExplorerHelpers";
import { emptyTreeStyle, explorerRootStyle, refreshBarStyle, refreshButtonStyle } from "./fileExplorerStyles";
import { useRecentWorkspaces } from "./useRecentWorkspaces";

export function FileExplorer() {
  const workspaceRoot = useStore((s) => s.workspaceRoot);
  const setWorkspaceRoot = useStore((s) => s.setWorkspaceRoot);
  const fileTree = useStore((s) => s.fileTree);
  const clearLanguageState = useLanguageStore((s) => s.clearLanguageState);
  const { openWorkspace, refreshTree } = useFileTree();
  const [hovered, setHovered] = useState(false);
  const recent = useRecentWorkspaces();

  const handleOpenWorkspace = useCallback(async () => {
    const root = await openWorkspace();

    if (root !== null) {
      clearLanguageState();
      setWorkspaceRoot(root);
    }
  }, [clearLanguageState, openWorkspace, setWorkspaceRoot]);

  const sorted = sortDirectoryEntries(fileTree);

  return (
    <div style={explorerRootStyle}>
      {workspaceRoot === null ? (
        <EmptyWorkspace
          error={recent.error}
          loading={recent.loading}
          onOpenRecent={recent.openRecent}
          onOpenWorkspace={handleOpenWorkspace}
          recentWorkspaces={recent.recentWorkspaces}
        />
      ) : (
        <WorkspaceFileTree
          hovered={hovered}
          onHoverChange={setHovered}
          onRefresh={refreshTree}
          sortedEntries={sorted}
        />
      )}
    </div>
  );
}

interface WorkspaceFileTreeProps {
  readonly hovered: boolean;
  readonly onHoverChange: (hovered: boolean) => void;
  readonly onRefresh: () => void;
  readonly sortedEntries: readonly DirectoryEntry[];
}

function WorkspaceFileTree(props: WorkspaceFileTreeProps) {
  return (
    <>
      <div style={refreshBarStyle}>
        <button
          onClick={props.onRefresh}
          onMouseEnter={() => props.onHoverChange(true)}
          onMouseLeave={() => props.onHoverChange(false)}
          style={refreshButtonStyle(props.hovered)}
          title="刷新"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      {props.sortedEntries.map((entry) => (
        <FileTreeItem key={entry.path} entry={entry} depth={0} />
      ))}
      {props.sortedEntries.length === 0 && <div style={emptyTreeStyle}>工作区暂无文件</div>}
    </>
  );
}
