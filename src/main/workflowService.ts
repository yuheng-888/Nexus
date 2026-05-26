import { randomUUID } from "node:crypto";
import type {
  WorkflowDefinition,
  WorkflowDefinitionDraft,
  WorkflowRun,
  WorkflowRunRequest,
  WorkflowStep
} from "../workflowContracts.js";
import type { GitService } from "./gitService.js";
import type { RagService } from "./ragService.js";
import type { SubagentService } from "./subagentService.js";
import { ShellWorkflowCommandRunner, type WorkflowCommandRunner } from "./workflowCommandRunner.js";
import { WorkflowStepRunner } from "./workflowStepRunner.js";
import { WorkflowStore } from "./workflowStore.js";
import { getBuiltinWorkflowDefinitions } from "./workflowTemplates.js";

export interface WorkflowServiceOptions {
  readonly commandRunner?: WorkflowCommandRunner;
  readonly git: GitService;
  readonly rag: RagService;
  readonly store?: WorkflowStore;
  readonly subagents: SubagentService;
  readonly workspaceRoot: string | null;
}

export class WorkflowService {
  private readonly commandRunner: WorkflowCommandRunner;
  private readonly git: GitService;
  private readonly rag: RagService;
  private readonly store: WorkflowStore;
  private readonly subagents: SubagentService;
  private readonly runs: WorkflowRun[] = [];
  private workspaceRoot: string | null;

  constructor(options: WorkflowServiceOptions) {
    this.commandRunner = options.commandRunner ?? new ShellWorkflowCommandRunner();
    this.git = options.git;
    this.rag = options.rag;
    this.store = options.store ?? new WorkflowStore();
    this.subagents = options.subagents;
    this.workspaceRoot = options.workspaceRoot;
  }

  setWorkspaceRoot(workspaceRoot: string | null): void {
    this.workspaceRoot = workspaceRoot;
  }

  async listDefinitions(): Promise<readonly WorkflowDefinition[]> {
    return [...getBuiltinWorkflowDefinitions(), ...this.store.load().definitions];
  }

  async getDefinition(id: string): Promise<WorkflowDefinition> {
    const definition = (await this.listDefinitions()).find((item) => item.id === id);
    if (definition === undefined) throw new Error(`Unknown workflow: ${id}`);
    return definition;
  }

  async saveDefinition(draft: WorkflowDefinitionDraft): Promise<WorkflowDefinition> {
    const definitions = this.store.load().definitions;
    const existing = definitions.find((item) => item.id === draft.id);
    const saved = toDefinition(draft, existing);
    this.store.save({ definitions: upsertDefinition(definitions, saved) });
    return saved;
  }

  async deleteDefinition(id: string): Promise<boolean> {
    const definitions = this.store.load().definitions;
    const next = definitions.filter((definition) => definition.id !== id);
    this.store.save({ definitions: next });
    return next.length !== definitions.length;
  }

  listRuns(): readonly WorkflowRun[] {
    return [...this.runs];
  }

  async run(request: WorkflowRunRequest): Promise<WorkflowRun> {
    const definition = await this.getDefinition(request.workflowId);
    const startedAt = Date.now();
    const stepResults = [];

    for (const step of definition.steps) {
      const result = await this.createStepRunner().run(step, request.input);
      stepResults.push(result);
      if (result.status === "failed") return this.finishFailed(definition, startedAt, stepResults, request, result.error);
    }

    return this.finishCompleted(definition, startedAt, stepResults, request);
  }

  private createStepRunner(): WorkflowStepRunner {
    return new WorkflowStepRunner({
      commandRunner: this.commandRunner,
      git: this.git,
      rag: this.rag,
      subagents: this.subagents,
      workspaceRoot: this.workspaceRoot
    });
  }

  private finishCompleted(
    definition: WorkflowDefinition,
    startedAt: number,
    stepResults: WorkflowRun["stepResults"],
    request: WorkflowRunRequest
  ): WorkflowRun {
    return this.recordRun({ definition, input: request.input, startedAt, status: "completed", stepResults });
  }

  private finishFailed(
    definition: WorkflowDefinition,
    startedAt: number,
    stepResults: WorkflowRun["stepResults"],
    request: WorkflowRunRequest,
    error: string | undefined
  ): WorkflowRun {
    return this.recordRun({ definition, error, input: request.input, startedAt, status: "failed", stepResults });
  }

  private recordRun(input: RecordRunInput): WorkflowRun {
    const run = toRun(input);
    this.runs.unshift(run);
    return run;
  }
}

interface RecordRunInput {
  readonly definition: WorkflowDefinition;
  readonly error?: string;
  readonly input?: WorkflowRunRequest["input"];
  readonly startedAt: number;
  readonly status: WorkflowRun["status"];
  readonly stepResults: WorkflowRun["stepResults"];
}

function toDefinition(draft: WorkflowDefinitionDraft, existing: WorkflowDefinition | undefined): WorkflowDefinition {
  const now = Date.now();
  return {
    createdAt: existing?.createdAt ?? now,
    description: draft.description,
    id: draft.id ?? randomUUID(),
    name: requireName(draft.name),
    source: "user",
    steps: requireSteps(draft.steps),
    updatedAt: now
  };
}

function upsertDefinition(
  definitions: readonly WorkflowDefinition[],
  saved: WorkflowDefinition
): readonly WorkflowDefinition[] {
  return definitions.some((definition) => definition.id === saved.id)
    ? definitions.map((definition) => definition.id === saved.id ? saved : definition)
    : [...definitions, saved];
}

function toRun(input: RecordRunInput): WorkflowRun {
  return {
    completedAt: Date.now(),
    definitionId: input.definition.id,
    definitionName: input.definition.name,
    error: input.error,
    id: randomUUID(),
    input: input.input,
    startedAt: input.startedAt,
    status: input.status,
    stepResults: input.stepResults
  };
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Workflow name is required");
  return trimmed;
}

function requireSteps(steps: readonly WorkflowStep[]): readonly WorkflowStep[] {
  if (steps.length === 0) throw new Error("Workflow must contain at least one step");
  return steps;
}
