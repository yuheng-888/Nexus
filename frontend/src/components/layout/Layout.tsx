import React, { useCallback, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useStore } from "../../store/useStore";
import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { SidebarNav } from "../sidebar/SidebarNav";
import { SidebarContent } from "../sidebar/SidebarContent";
import { EditorArea } from "../editor/EditorArea";
import { BottomPanel } from "./BottomPanel";
import { QuickOpen } from "../editor/QuickOpen";
import { useQuickOpenShortcut } from "../editor/useQuickOpenShortcut";
import { CommandPalette } from "../commandPalette/CommandPalette";
import { useCommandPaletteShortcut } from "../commandPalette/useCommandPaletteShortcut";
import type { SidebarPanel } from "../../store/useStore";

export function Layout() {
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const openCommandPalette = useCallback(() => setCommandPaletteVisible(true), []);
  const openQuickOpen = useCallback(() => setQuickOpenVisible(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteVisible(false), []);
  const closeQuickOpen = useCallback(() => setQuickOpenVisible(false), []);

  useCommandPaletteShortcut(openCommandPalette);
  useQuickOpenShortcut(openQuickOpen);

  return (
    <LayoutChrome
      commandPaletteVisible={commandPaletteVisible}
      onCloseCommandPalette={closeCommandPalette}
      onCloseQuickOpen={closeQuickOpen}
      onOpenQuickOpen={openQuickOpen}
      quickOpenVisible={quickOpenVisible}
    />
  );
}

interface LayoutChromeProps {
  readonly commandPaletteVisible: boolean;
  readonly onCloseCommandPalette: () => void;
  readonly onCloseQuickOpen: () => void;
  readonly onOpenQuickOpen: () => void;
  readonly quickOpenVisible: boolean;
}

function LayoutChrome(props: LayoutChromeProps) {
  const sidebarVisible = useStore((s) => s.sidebarVisible);
  const bottomPanelVisible = useStore((s) => s.bottomPanelVisible);
  const activeSidebar = useStore((s) => s.activeSidebar);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      <TitleBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SidebarRail />
        <WorkspacePanels
          activeSidebar={activeSidebar}
          bottomPanelVisible={bottomPanelVisible}
          sidebarVisible={sidebarVisible}
        />
      </div>
      <StatusBar />
      <QuickOpen open={props.quickOpenVisible} onClose={props.onCloseQuickOpen} />
      <CommandPalette
        onClose={props.onCloseCommandPalette}
        onOpenQuickOpen={props.onOpenQuickOpen}
        open={props.commandPaletteVisible}
      />
    </div>
  );
}

function SidebarRail() {
  return (
    <div style={{
      width: "var(--sidebar-width)",
      flexShrink: 0,
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 8,
      gap: 4,
    }}>
      <SidebarNav />
    </div>
  );
}

interface WorkspacePanelsProps {
  readonly activeSidebar: SidebarPanel;
  readonly bottomPanelVisible: boolean;
  readonly sidebarVisible: boolean;
}

function WorkspacePanels(props: WorkspacePanelsProps) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <PanelGroup direction="horizontal" autoSaveId="nexus-main">
        {props.sidebarVisible && props.activeSidebar && <SidebarPanel />}
        <Panel minSize={30}>
          <EditorAndBottomPanel bottomPanelVisible={props.bottomPanelVisible} />
        </Panel>
      </PanelGroup>
    </div>
  );
}

function SidebarPanel() {
  return (
    <>
      <Panel defaultSize={22} minSize={15} maxSize={40}>
        <SidebarContent />
      </Panel>
      <PanelResizeHandle />
    </>
  );
}

function EditorAndBottomPanel({ bottomPanelVisible }: { readonly bottomPanelVisible: boolean }) {
  return (
    <PanelGroup direction="vertical" autoSaveId="nexus-editor-bottom">
      <Panel minSize={30}>
        <EditorArea />
      </Panel>
      {bottomPanelVisible && (
        <>
          <PanelResizeHandle />
          <Panel defaultSize={35} minSize={15} maxSize={70}>
            <BottomPanel />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
