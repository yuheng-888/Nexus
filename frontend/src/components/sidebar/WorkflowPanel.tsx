import type React from "react";
import { Copy, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { WorkflowDefinition, WorkflowRun } from "../../types/workflow";
import {
  isWorkflowEditable,
  summarizeWorkflowSteps,
  workflowRunStatusLabel,
  workflowSourceLabel
} from "./workflowPanelModel";
import { useWorkflowPanelState } from "./useWorkflowPanelState";
import { WorkflowEditor } from "./WorkflowEditor";
import {
  actionRowStyle,
  badgeStyle,
  cardStyle,
  dangerButtonStyle,
  descriptionStyle,
  errorStyle,
  headerStyle,
  iconButtonStyle,
  messageStyle,
  metaStyle,
  mutedBlockStyle,
  outputStyle,
  panelStyle,
  runButtonStyle,
  sectionTitleStyle,
  secondaryButtonStyle,
  selectedCardStyle,
  titleStyle
} from "./workflowPanelStyles";

export function WorkflowPanel() {
  const state = useWorkflowPanelState();

  return (
    <div style={panelStyle}>
      <WorkflowHeader count={state.workflowCount} loading={state.loading} onCreate={state.createWorkflow} onRefresh={state.load} />
      {state.error !== "" && <div style={errorStyle}>{state.error}</div>}
      {state.editorDraft !== null && (
        <WorkflowEditor
          draft={state.editorDraft}
          onCancel={() => state.setEditorDraft(null)}
          onChange={state.setEditorDraft}
          onSave={state.saveWorkflow}
          saving={state.saving}
        />
      )}
      <WorkflowList
        deletingId={state.deletingId}
        loading={state.loading}
        onDelete={state.deleteWorkflow}
        onEdit={state.editWorkflow}
        onRun={state.runWorkflow}
        onSelect={state.setSelectedId}
        runningId={state.runningId}
        selectedId={state.selectedId}
        workflows={state.sortedWorkflows}
      />
      <RunHistory runs={state.runs} />
    </div>
  );
}

function WorkflowHeader(props: {
  readonly count: number;
  readonly loading: boolean;
  readonly onCreate: () => void;
  readonly onRefresh: () => void;
}) {
  return (
    <div style={headerStyle}>
      <span>{props.count} 个工作流</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button disabled={props.loading} onClick={props.onCreate} style={secondaryButtonStyle} title="新建工作流">
          <Plus size={12} /> 新建
        </button>
        <button disabled={props.loading} onClick={() => void props.onRefresh()} style={iconButtonStyle} title="刷新">
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}

function WorkflowList(props: {
  readonly deletingId: string | null;
  readonly loading: boolean;
  readonly onDelete: (workflowId: string) => Promise<void>;
  readonly onEdit: (workflow: WorkflowDefinition) => void;
  readonly onRun: (workflowId: string) => Promise<void>;
  readonly onSelect: (workflowId: string) => void;
  readonly runningId: string | null;
  readonly selectedId: string | null;
  readonly workflows: readonly WorkflowDefinition[];
}) {
  if (props.loading) return <div style={mutedBlockStyle}>加载工作流...</div>;
  if (props.workflows.length === 0) return <div style={mutedBlockStyle}>暂无工作流</div>;

  return (
    <>
      <div style={sectionTitleStyle}>定义</div>
      {props.workflows.map((workflow) => (
        <WorkflowCard
          deleting={props.deletingId === workflow.id}
          key={workflow.id}
          onDelete={() => props.onDelete(workflow.id)}
          onEdit={() => props.onEdit(workflow)}
          onRun={() => props.onRun(workflow.id)}
          onSelect={() => props.onSelect(workflow.id)}
          running={props.runningId === workflow.id}
          selected={props.selectedId === workflow.id}
          workflow={workflow}
        />
      ))}
    </>
  );
}

function WorkflowCard(props: {
  readonly deleting: boolean;
  readonly onDelete: () => Promise<void>;
  readonly onEdit: () => void;
  readonly onRun: () => Promise<void>;
  readonly onSelect: () => void;
  readonly running: boolean;
  readonly selected: boolean;
  readonly workflow: WorkflowDefinition;
}) {
  return (
    <div onClick={props.onSelect} style={props.selected ? selectedCardStyle : cardStyle}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
        <span style={titleStyle}>{props.workflow.name}</span>
        <span style={badgeStyle}>{workflowSourceLabel(props.workflow.source)}</span>
      </div>
      <div style={metaStyle}>{summarizeWorkflowSteps(props.workflow.steps)}</div>
      {props.workflow.description !== undefined && <div style={descriptionStyle}>{props.workflow.description}</div>}
      <WorkflowActions {...props} editable={isWorkflowEditable(props.workflow)} />
    </div>
  );
}

function WorkflowActions(props: {
  readonly deleting: boolean;
  readonly editable: boolean;
  readonly onDelete: () => Promise<void>;
  readonly onEdit: () => void;
  readonly onRun: () => Promise<void>;
  readonly running: boolean;
}) {
  return (
    <div style={actionRowStyle}>
      <button disabled={props.running} onClick={(event) => runFromButton(event, props.onRun)} style={runButtonStyle}>
        <Play size={12} />
        {props.running ? "运行中" : "运行"}
      </button>
      <button onClick={(event) => editFromButton(event, props.onEdit)} style={secondaryButtonStyle}>
        {props.editable ? <Pencil size={12} /> : <Copy size={12} />}
        {props.editable ? "编辑" : "复制"}
      </button>
      {props.editable && (
        <button disabled={props.deleting} onClick={(event) => deleteFromButton(event, props.onDelete)} style={dangerButtonStyle}>
          <Trash2 size={12} />
          {props.deleting ? "删除中" : "删除"}
        </button>
      )}
    </div>
  );
}

function RunHistory({ runs }: { readonly runs: readonly WorkflowRun[] }) {
  const recentRuns = runs.slice(0, 4);
  if (recentRuns.length === 0) return <div style={messageStyle}>暂无运行记录</div>;

  return (
    <>
      <div style={sectionTitleStyle}>最近运行</div>
      {recentRuns.map((run) => <RunCard key={run.id} run={run} />)}
    </>
  );
}

function RunCard({ run }: { readonly run: WorkflowRun }) {
  return (
    <div style={cardStyle}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <span style={titleStyle}>{run.definitionName}</span>
        <span style={badgeStyle}>{workflowRunStatusLabel(run.status)}</span>
      </div>
      {run.error !== undefined && <div style={errorStyle}>{run.error}</div>}
      {run.stepResults.map((step) => (
        <div key={step.stepId} style={metaStyle}>
          {step.stepName} · {workflowRunStatusLabel(step.status)}
          {step.output !== "" && <pre style={outputStyle}>{step.output}</pre>}
        </div>
      ))}
    </div>
  );
}

function runFromButton(
  event: React.MouseEvent<HTMLButtonElement>,
  onRun: () => Promise<void>
): void {
  event.stopPropagation();
  void onRun();
}

function editFromButton(
  event: React.MouseEvent<HTMLButtonElement>,
  onEdit: () => void
): void {
  event.stopPropagation();
  onEdit();
}

function deleteFromButton(
  event: React.MouseEvent<HTMLButtonElement>,
  onDelete: () => Promise<void>
): void {
  event.stopPropagation();
  void onDelete();
}
