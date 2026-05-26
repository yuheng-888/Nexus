import type { GitCommandResult } from "../gitContracts.js";
import type {
  WorkflowRunInput,
  WorkflowStep,
  WorkflowStepResult
} from "../workflowContracts.js";
import { resolveWorkspacePath } from "./pathGuards.js";
import type { GitService } from "./gitService.js";
import type { RagService } from "./ragService.js";
import type { SubagentService } from "./subagentService.js";
import type { WorkflowCommandRunner } from "./workflowCommandRunner.js";
import { interpolateWorkflowText } from "./workflowInterpolation.js";

export interface WorkflowStepRunnerOptions {
  readonly commandRunner: WorkflowCommandRunner;
  readonly git: GitService;
  readonly rag: RagService;
  readonly subagents: SubagentService;
  readonly workspaceRoot: string | null;
}

export class WorkflowStepRunner {
  private readonly options: WorkflowStepRunnerOptions;

  constructor(options: WorkflowStepRunnerOptions) {
    this.options = options;
  }

  async run(step: WorkflowStep, input: WorkflowRunInput | undefined): Promise<WorkflowStepResult> {
    const startedAt = Date.now();

    try {
      return this.completed(step, startedAt, await this.runStep(step, input));
    } catch (error) {
      return this.failed(step, startedAt, toErrorMessage(error));
    }
  }

  private runStep(step: WorkflowStep, input: WorkflowRunInput | undefined): Promise<string> {
    if (step.type === "command") return this.runCommand(step, input);
    if (step.type === "git") return this.runGit(step);
    if (step.type === "rag") return this.runRag(step, input);
    if (step.type === "subagent") return this.runSubagent(step, input);
    return Promise.resolve(JSON.stringify(step.todos, null, 2));
  }

  private async runCommand(step: Extract<WorkflowStep, { type: "command" }>, input?: WorkflowRunInput): Promise<string> {
    const cwd = resolveWorkflowCwd(this.options.workspaceRoot, step.cwd);
    const result = await this.options.commandRunner.run({
      command: interpolateWorkflowText(step.command, input),
      cwd,
      timeoutMs: step.timeoutMs
    });

    if (result.exitCode !== 0) throw new Error(formatCommandFailure(result));
    return formatCommandResult(result);
  }

  private async runGit(step: Extract<WorkflowStep, { type: "git" }>): Promise<string> {
    if (step.operation === "status") return formatCommandResult(await this.options.git.status(step.cwd));
    if (step.operation === "diff") return formatCommandResult(await this.options.git.diff(step));
    if (step.operation === "log") return JSON.stringify(await this.options.git.log(step), null, 2);
    return JSON.stringify(await this.options.git.summary(step.cwd), null, 2);
  }

  private async runRag(step: Extract<WorkflowStep, { type: "rag" }>, input?: WorkflowRunInput): Promise<string> {
    if (step.operation === "buildIndex") return JSON.stringify(await this.options.rag.buildIndex(), null, 2);
    if (step.operation === "status") return JSON.stringify(await this.options.rag.status(), null, 2);

    const request = { limit: step.limit, query: interpolateWorkflowText(step.query ?? "{{prompt}}", input) };
    if (step.operation === "context") return JSON.stringify(await this.options.rag.context(request), null, 2);
    return JSON.stringify(await this.options.rag.search(request), null, 2);
  }

  private async runSubagent(step: Extract<WorkflowStep, { type: "subagent" }>, input?: WorkflowRunInput): Promise<string> {
    const run = this.options.subagents.start({
      options: {
        cwd: step.cwd,
        model: step.model,
        profileId: step.profileId,
        prompt: interpolateWorkflowText(step.prompt, input)
      },
      workspaceRoot: this.options.workspaceRoot
    });

    return JSON.stringify(run, null, 2);
  }

  private completed(step: WorkflowStep, startedAt: number, output: string): WorkflowStepResult {
    return toStepResult(step, startedAt, "completed", output);
  }

  private failed(step: WorkflowStep, startedAt: number, error: string): WorkflowStepResult {
    return toStepResult(step, startedAt, "failed", "", error);
  }
}

function resolveWorkflowCwd(workspaceRoot: string | null, cwd = "."): string {
  if (workspaceRoot === null) throw new Error("No workspace is open");
  return resolveWorkspacePath(workspaceRoot, cwd);
}

function formatCommandResult(result: GitCommandResult): string {
  return [result.stdout.trimEnd(), result.stderr.trimEnd()].filter(Boolean).join("\n");
}

function formatCommandFailure(result: GitCommandResult): string {
  return `Command failed with exit code ${result.exitCode}\n${formatCommandResult(result)}`.trimEnd();
}

function toStepResult(
  step: WorkflowStep,
  startedAt: number,
  status: WorkflowStepResult["status"],
  output: string,
  error?: string
): WorkflowStepResult {
  return { completedAt: Date.now(), error, output, startedAt, status, stepId: step.id, stepName: step.name, type: step.type };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
