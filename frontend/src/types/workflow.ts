export type WorkflowSource = "builtin" | "user";
export type WorkflowRunStatus = "completed" | "failed" | "running";
export type WorkflowStepStatus = "completed" | "failed";
export type WorkflowGitOperation = "diff" | "log" | "status" | "summary";
export type WorkflowRagOperation = "buildIndex" | "context" | "search" | "status";
export type WorkflowTodoStatus = "completed" | "in_progress" | "pending";

export type WorkflowStep =
  | WorkflowCommandStep
  | WorkflowGitStep
  | WorkflowRagStep
  | WorkflowSubagentStep
  | WorkflowTodoStep;

interface WorkflowBaseStep {
  readonly description?: string;
  readonly id: string;
  readonly name: string;
}

export interface WorkflowCommandStep extends WorkflowBaseStep {
  readonly command: string;
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly type: "command";
}

export interface WorkflowGitStep extends WorkflowBaseStep {
  readonly cwd?: string;
  readonly limit?: number;
  readonly operation: WorkflowGitOperation;
  readonly path?: string;
  readonly ref?: string;
  readonly staged?: boolean;
  readonly type: "git";
}

export interface WorkflowRagStep extends WorkflowBaseStep {
  readonly limit?: number;
  readonly operation: WorkflowRagOperation;
  readonly query?: string;
  readonly type: "rag";
}

export interface WorkflowSubagentStep extends WorkflowBaseStep {
  readonly cwd?: string;
  readonly model?: string;
  readonly profileId?: string;
  readonly prompt: string;
  readonly type: "subagent";
}

export interface WorkflowTodoItem {
  readonly content: string;
  readonly status: WorkflowTodoStatus;
}

export interface WorkflowTodoStep extends WorkflowBaseStep {
  readonly todos: readonly WorkflowTodoItem[];
  readonly type: "todo";
}

export interface WorkflowDefinition {
  readonly createdAt: number;
  readonly description?: string;
  readonly id: string;
  readonly name: string;
  readonly source: WorkflowSource;
  readonly steps: readonly WorkflowStep[];
  readonly updatedAt: number;
}

export interface WorkflowDefinitionDraft {
  readonly description?: string;
  readonly id?: string;
  readonly name: string;
  readonly steps: readonly WorkflowStep[];
}

export interface WorkflowRunInput {
  readonly prompt?: string;
  readonly variables?: Record<string, string>;
}

export interface WorkflowRunRequest {
  readonly input?: WorkflowRunInput;
  readonly workflowId: string;
}

export interface WorkflowStepResult {
  readonly completedAt: number;
  readonly error?: string;
  readonly output: string;
  readonly startedAt: number;
  readonly status: WorkflowStepStatus;
  readonly stepId: string;
  readonly stepName: string;
  readonly type: WorkflowStep["type"];
}

export interface WorkflowRun {
  readonly completedAt?: number;
  readonly definitionId: string;
  readonly definitionName: string;
  readonly error?: string;
  readonly id: string;
  readonly input?: WorkflowRunInput;
  readonly startedAt: number;
  readonly status: WorkflowRunStatus;
  readonly stepResults: readonly WorkflowStepResult[];
}

export interface WorkflowApi {
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<WorkflowDefinition>;
  list(): Promise<readonly WorkflowDefinition[]>;
  run(request: WorkflowRunRequest): Promise<WorkflowRun>;
  runs(): Promise<readonly WorkflowRun[]>;
  save(definition: WorkflowDefinitionDraft): Promise<WorkflowDefinition>;
}
