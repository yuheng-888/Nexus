import React from "react";
import {
  AlertCircle,
  Archive,
  Bug,
  Download,
  FileSearch,
  GitCompare,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchCode,
  Shield,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import type { ReverseProject } from "../../types/reverse";
import { useOpenEditorLocation } from "../editor/useOpenEditorLocation";
import { ReversePathInput } from "./ReversePathInput";
import { AnalysisSummary, AsarResults, HookMeta, TargetSummary } from "./ReverseResultViews";
import {
  isReverseActionDisabled,
  reverseTargetTypeLabel
} from "./reversePanelModel";
import {
  badgeStyle,
  dangerButtonStyle,
  emptyStyle,
  errorStyle,
  findingStyle,
  headerStyle,
  iconButtonStyle,
  inputStyle,
  listStyle,
  messageStyle,
  metaStyle,
  panelStyle,
  primaryButtonStyle,
  rowStyle,
  secondaryButtonStyle,
  sectionStyle,
  sectionTitleStyle,
  splitRowStyle,
  textareaStyle,
  titleStyle
} from "./reversePanelStyles";
import type { ReversePanelState } from "./reversePanelStateTypes";
import { useReversePanelState } from "./useReversePanelState";

export function ReversePanel() {
  const state = useReversePanelState();
  const openEditorLocation = useOpenEditorLocation();
  const busy = state.action !== "";

  return (
    <div style={panelStyle}>
      <PanelHeader busy={busy} count={state.projects.length} onRefresh={state.refreshProjects} />
      {state.error !== "" && <Notice kind="error" message={state.error} />}
      {state.message !== "" && <Notice kind="message" message={state.message} />}
      <TargetSection busy={busy} onOpenFinding={openEditorLocation} state={state} />
      <AsarSection busy={busy} state={state} />
      <HookSection busy={busy} state={state} />
      <ProjectsSection busy={busy} state={state} />
    </div>
  );
}

function PanelHeader(props: { readonly busy: boolean; readonly count: number; readonly onRefresh: () => Promise<void> }) {
  return (
    <div style={headerStyle}>
      <span>{props.count} 个逆向项目</span>
      <button disabled={props.busy} onClick={() => void props.onRefresh()} style={buttonState(iconButtonStyle, props.busy)} title="刷新逆向项目">
        {props.busy ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
      </button>
    </div>
  );
}

function TargetSection(props: {
  readonly busy: boolean;
  readonly onOpenFinding: ReturnType<typeof useOpenEditorLocation>;
  readonly state: ReversePanelState;
}) {
  const disabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.targetPath });
  return (
    <section style={sectionStyle}>
      <SectionTitle icon={<SearchCode size={13} />} title="目标" />
      <ReversePathInput
        buttons={[{ icon: "file", onPick: props.state.pickTargetPath, title: "选择目标" }]}
        disabled={props.busy}
        onChange={props.state.setTargetPath}
        placeholder="目标路径 / Electron 应用 / ASAR"
        value={props.state.targetPath}
      />
      <div style={rowStyle}>
        <button disabled={disabled} onClick={() => void props.state.detectTarget()} style={buttonState(primaryButtonStyle, disabled)}>
          {props.state.action === "detect" ? <Loader2 className="animate-spin" size={12} /> : <FileSearch size={12} />} 识别
        </button>
        <button disabled={disabled} onClick={() => void props.state.scanJavaScript()} style={buttonState(secondaryButtonStyle, disabled)}>
          <Bug size={12} /> 扫描 JS
        </button>
      </div>
      {props.state.target !== null && <TargetSummary target={props.state.target} />}
      <AnalysisSummary onOpenFinding={props.onOpenFinding} result={props.state.analysis} />
    </section>
  );
}

function AsarSection(props: { readonly busy: boolean; readonly state: ReversePanelState }) {
  const targetDisabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.targetPath });
  const outputDisabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.outputPath });
  const diffDisabled = props.busy || props.state.targetPath.trim() === "" || props.state.comparePath.trim() === "";
  return (
    <section style={sectionStyle}>
      <SectionTitle icon={<Archive size={13} />} title="ASAR" />
      <ReversePathInput
        buttons={[
          { icon: "directory", onPick: props.state.pickOutputDirectory, title: "选择输出目录" },
          { icon: "save", onPick: props.state.pickOutputAsarPath, title: "选择输出 ASAR" }
        ]}
        disabled={props.busy}
        onChange={props.state.setOutputPath}
        placeholder="输出目录 / 输出 ASAR 路径"
        value={props.state.outputPath}
      />
      <ReversePathInput
        buttons={[{ icon: "file", onPick: props.state.pickComparePath, title: "选择对比 ASAR" }]}
        disabled={props.busy}
        onChange={props.state.setComparePath}
        placeholder="对比 ASAR 路径"
        value={props.state.comparePath}
      />
      <div style={rowStyle}>
        <button disabled={targetDisabled} onClick={() => void props.state.inspectAsar()} style={buttonState(primaryButtonStyle, targetDisabled)}>
          <FileSearch size={12} /> 读取
        </button>
        <button disabled={targetDisabled || outputDisabled} onClick={() => void props.state.extractAsar()} style={buttonState(secondaryButtonStyle, targetDisabled || outputDisabled)}>
          <Download size={12} /> 解包
        </button>
        <button disabled={targetDisabled || outputDisabled} onClick={() => void props.state.packAsar()} style={buttonState(secondaryButtonStyle, targetDisabled || outputDisabled)}>
          <Upload size={12} /> 打包
        </button>
        <button disabled={diffDisabled} onClick={() => void props.state.diffAsar()} style={buttonState(secondaryButtonStyle, diffDisabled)}>
          <GitCompare size={12} /> 比较
        </button>
      </div>
      <AsarResults
        diff={props.state.asarDiff}
        extract={props.state.asarExtract}
        inspect={props.state.asarInspect}
        onReveal={props.state.revealPath}
        pack={props.state.asarPack}
      />
    </section>
  );
}

function HookSection(props: { readonly busy: boolean; readonly state: ReversePanelState }) {
  const outputDisabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.outputPath });
  const targetDisabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.targetPath });
  const restoreDisabled = props.busy || props.state.entryPath.trim() === "" || props.state.backupPath.trim() === "";
  return (
    <section style={sectionStyle}>
      <SectionTitle icon={<Shield size={13} />} title="jshook" />
      <input onChange={(event) => props.state.setHookFilename(event.target.value)} placeholder="hook 文件名，留空使用默认值" style={inputStyle} value={props.state.hookFilename} />
      <ReversePathInput
        buttons={[{ icon: "file", onPick: props.state.pickEntryPath, title: "选择入口 JS" }]}
        disabled={props.busy}
        onChange={props.state.setEntryPath}
        placeholder="入口 JS 路径"
        value={props.state.entryPath}
      />
      <ReversePathInput
        buttons={[{ icon: "file", onPick: props.state.pickBackupPath, title: "选择备份文件" }]}
        disabled={props.busy}
        onChange={props.state.setBackupPath}
        placeholder="恢复用备份路径"
        value={props.state.backupPath}
      />
      <div style={rowStyle}>
        <button disabled={outputDisabled} onClick={() => void props.state.generateHook()} style={buttonState(primaryButtonStyle, outputDisabled)}>
          <Wand2 size={12} /> 生成
        </button>
        <button disabled={targetDisabled} onClick={() => void props.state.injectHook()} style={buttonState(secondaryButtonStyle, targetDisabled)}>
          <Bug size={12} /> 注入
        </button>
        <button disabled={restoreDisabled} onClick={() => void props.state.restoreHook()} style={buttonState(secondaryButtonStyle, restoreDisabled)}>
          <RotateCcw size={12} /> 恢复
        </button>
      </div>
      <HookMeta
        generate={props.state.hookGenerate}
        inject={props.state.hookInject}
        onReveal={props.state.revealPath}
        restore={props.state.hookRestore}
      />
    </section>
  );
}

function ProjectsSection(props: { readonly busy: boolean; readonly state: ReversePanelState }) {
  const addDisabled = isReverseActionDisabled({ action: props.state.action, requiredPath: props.state.targetPath });
  return (
    <section style={sectionStyle}>
      <SectionTitle icon={<Archive size={13} />} title="项目" />
      <textarea onChange={(event) => props.state.setNotes(event.target.value)} placeholder="项目备注" style={textareaStyle} value={props.state.notes} />
      <button disabled={addDisabled} onClick={() => void props.state.addProject()} style={buttonState(primaryButtonStyle, addDisabled)}>
        <Plus size={12} /> 加入当前目标
      </button>
      <ProjectList busy={props.busy} projects={props.state.projects} state={props.state} />
    </section>
  );
}

function ProjectList(props: { readonly busy: boolean; readonly projects: readonly ReverseProject[]; readonly state: ReversePanelState }) {
  if (props.projects.length === 0) return <div style={emptyStyle}>暂无逆向项目</div>;
  return (
    <div style={listStyle}>
      {props.projects.map((project) => (
        <div key={project.id} style={findingStyle}>
          <div style={splitRowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={titleStyle}>{project.name}</div>
              <div style={metaStyle}>{project.targetPath}</div>
              <span style={badgeStyle}>{reverseTargetTypeLabel(project.targetType)}</span>
            </div>
            <ProjectButtons busy={props.busy} project={project} state={props.state} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectButtons(props: { readonly busy: boolean; readonly project: ReverseProject; readonly state: ReversePanelState }) {
  return (
    <div style={rowStyle}>
      <button disabled={props.busy} onClick={() => props.state.setTargetPath(props.project.targetPath)} style={buttonState(secondaryButtonStyle, props.busy)}>
        载入
      </button>
      <button disabled={props.busy} onClick={() => void props.state.removeProject(props.project.id)} style={buttonState(dangerButtonStyle, props.busy)} title="删除项目">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function Notice(props: { readonly kind: "error" | "message"; readonly message: string }) {
  return (
    <div style={props.kind === "error" ? errorStyle : messageStyle}>
      {props.kind === "error" && <AlertCircle size={13} />} {props.message}
    </div>
  );
}

function SectionTitle(props: { readonly icon: React.ReactNode; readonly title: string }) {
  return <div style={sectionTitleStyle}>{props.icon}{props.title}</div>;
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;
  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}
