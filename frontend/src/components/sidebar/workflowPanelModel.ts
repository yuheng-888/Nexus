import type {
  WorkflowDefinition,
  WorkflowDefinitionDraft,
  WorkflowRunStatus,
  WorkflowSource,
  WorkflowStep
} from "../../types/workflow";

export type { WorkflowDefinition };

const STEP_LABELS: Readonly<Record<WorkflowStep["type"], string>> = {
  command: "命令",
  git: "Git",
  rag: "RAG",
  subagent: "子代理",
  todo: "任务"
};

export interface WorkflowEditorDraft {
  readonly description: string;
  readonly id?: string;
  readonly name: string;
  readonly stepsJson: string;
}

export function sortWorkflowDefinitions(
  workflows: readonly WorkflowDefinition[]
): readonly WorkflowDefinition[] {
  return [...workflows].sort(compareWorkflows);
}

export function workflowSourceLabel(source: WorkflowSource): string {
  return source === "builtin" ? "内置" : "用户";
}

export function workflowRunStatusLabel(status: WorkflowRunStatus): string {
  if (status === "completed") return "完成";
  if (status === "failed") return "失败";

  return "运行中";
}

export function summarizeWorkflowSteps(steps: readonly WorkflowStep[]): string {
  const counts = countStepTypes(steps);
  const details = Object.entries(counts).map(([type, count]) => `${STEP_LABELS[type as WorkflowStep["type"]]} ${count}`);

  return [`${steps.length} 步`, ...details].join(" · ");
}

export function emptyWorkflowDraft(): WorkflowEditorDraft {
  return {
    description: "",
    name: "新的工作流",
    stepsJson: JSON.stringify([defaultTodoStep()], null, 2)
  };
}

export function createWorkflowDraft(workflow: WorkflowDefinition): WorkflowEditorDraft {
  const editable = isWorkflowEditable(workflow);
  return {
    description: workflow.description ?? "",
    id: editable ? workflow.id : undefined,
    name: editable ? workflow.name : `${workflow.name} 副本`,
    stepsJson: JSON.stringify(workflow.steps, null, 2)
  };
}

export function isWorkflowEditable(workflow: WorkflowDefinition): boolean {
  return workflow.source === "user";
}

export function parseWorkflowDraft(draft: WorkflowEditorDraft): WorkflowDefinitionDraft {
  const name = draft.name.trim();
  if (name === "") throw new Error("工作流名称不能为空");
  const steps = parseWorkflowSteps(draft.stepsJson);
  const description = draft.description.trim();

  return {
    description: description === "" ? undefined : description,
    id: draft.id,
    name,
    steps
  };
}

export function workflowErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `工作流执行失败: ${message}`;
}

function defaultTodoStep(): WorkflowStep {
  return {
    id: "todo",
    name: "任务",
    todos: [{ content: "描述要完成的事", status: "pending" }],
    type: "todo"
  };
}

function parseWorkflowSteps(source: string): readonly WorkflowStep[] {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (Array.isArray(parsed)) return parsed as readonly WorkflowStep[];
  } catch (error) {
    throw new Error(`步骤 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error("步骤 JSON 必须是数组");
}

function compareWorkflows(a: WorkflowDefinition, b: WorkflowDefinition): number {
  if (a.source !== b.source) return a.source === "builtin" ? -1 : 1;

  return a.name.localeCompare(b.name);
}

function countStepTypes(steps: readonly WorkflowStep[]): Partial<Record<WorkflowStep["type"], number>> {
  return steps.reduce<Partial<Record<WorkflowStep["type"], number>>>((counts, step) => ({
    ...counts,
    [step.type]: (counts[step.type] ?? 0) + 1
  }), {});
}
