import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useFileTree } from "../../hooks/useFileTree";
import type { DirectoryEntry } from "../../types/nexus";
import { getFileColor } from "./fileExplorerHelpers";
import { iconCellStyle, treeNameStyle, treeRowStyle } from "./fileExplorerStyles";

interface FileTreeItemProps {
  readonly depth: number;
  readonly entry: DirectoryEntry;
}

export function FileTreeItem({ entry, depth }: FileTreeItemProps) {
  const [children, setChildren] = useState<DirectoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expandedDirs = useStore((s) => s.expandedDirs);
  const toggleDir = useStore((s) => s.toggleDir);
  const activeTab = useStore((s) => s.activeTab);
  const { loadDir, openFileByEntry } = useFileTree();
  const isExpanded = expandedDirs.has(entry.path);
  const isActive = activeTab === entry.path;

  const handleClick = useCallback(async () => {
    if (!entry.isDirectory) {
      openFileByEntry(entry.path, entry.name, entry.absolutePath);
      return;
    }

    if (!loaded) {
      const items = await loadDir(entry.path);
      setChildren([...items]);
      setLoaded(true);
    }
    toggleDir(entry.path);
  }, [entry, loaded, loadDir, openFileByEntry, toggleDir]);

  return (
    <div>
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={treeRowStyle({ depth, hovered, isActive })}
      >
        <DirectoryToggle entry={entry} isExpanded={isExpanded} />
        <EntryIcon entry={entry} isExpanded={isExpanded} />
        <span style={{ ...treeNameStyle, color: treeNameColor(isActive), fontWeight: isActive ? 500 : 400 }}>
          {entry.name}
        </span>
      </div>
      {entry.isDirectory && isExpanded && children.map((child) => (
        <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function DirectoryToggle(props: { readonly entry: DirectoryEntry; readonly isExpanded: boolean }) {
  return (
    <div style={{ ...iconCellStyle, color: "var(--text-muted)" }}>
      {props.entry.isDirectory ? (
        props.isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
      ) : <span style={{ width: 13 }} />}
    </div>
  );
}

function EntryIcon(props: { readonly entry: DirectoryEntry; readonly isExpanded: boolean }) {
  if (!props.entry.isDirectory) {
    return <div style={iconCellStyle}><File size={15} color={getFileColor(props.entry.name)} /></div>;
  }

  return (
    <div style={iconCellStyle}>
      {props.isExpanded ? <FolderOpen size={15} color="#dcb67a" /> : <Folder size={15} color="#dcb67a" />}
    </div>
  );
}

function treeNameColor(isActive: boolean): string {
  return isActive ? "var(--text-active)" : "var(--text-primary)";
}
