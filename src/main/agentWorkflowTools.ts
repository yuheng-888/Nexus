import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunInput,
  WorkflowRunRequest,
  WorkflowStep,
  WorkflowStepResult
} from "../workflowContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";
import type { WorkflowService } from "./workflowService.js";

export interface AgentWorkflowToolProvider {
  listWorkflows(): Promise<string>;
  previewRunWorkflow(args: Record<string, unknown>): Promise<string>;
  runWorkflow(args: Record<string, unknown>): Promise<string>;
}

type WorkflowServiceResolver = WorkflowService | (() => WorkflowService);

export class NativeAgentWorkflowToolProvider implements AgentWorkflowToolProvider {
  private readonly service: WorkflowServiceResolver;

  constructor(options: { readonly service: WorkflowServiceResolver }) {
    this.service = options.service;
  }

  async listWorkflows(): Promise<string> {
    return formatDefinitions(await this.resolveService().listDefinitions());
  }

  async previewRunWorkflow(args: Record<string, unknown>): Promise<string> {
    const request = readRunRequest(args);
    const definition = await this.resolveService().getDefinition(request.workflowId);
    return [`Run workflow: ${definition.name} (${definition.id})`, `steps: ${definition.steps.length}`].join("\n");
  }

  async runWorkflow(args: Record<string, unknown>): Promise<string> {
    return formatRun(await this.resolveService().run(readRunRequest(args)));
  }

  private resolveService(): WorkflowService {
    return typeof this.service === "function" ? this.service() : this.service;
  }
}

export function createWorkflowToolSpecs(provider: AgentWorkflowToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "List available Nexus workflows and macros.",
      name: "workflows.list",
      parameters: "none",
      permission: "read",
      run: () => requireProvider(provider).listWorkflows()
    },
    {
      description: "Run a Nexus workflow or macro.",
      name: "workflows.run",
      parameters: "workflowId: string, prompt?: string, variables?: Record<string,string>",
      permission: "write",
      preview: (args) => requireProvider(provider).previewRunWorkflow(args),
      run: (args) => requireProvider(provider).runWorkflow(args)
    }
  ];
}

function readRunRequest(args: Record<string, unknown>): WorkflowRunRequest {
  const input = readInput(args);
  return {
    input,
    workflowId: readRequiredString(args, "workflowId")
  };
}

function readInput(args: Record<string, unknown>): WorkflowRunInput | undefined {
  const prompt = readOptionalString(args, "prompt");
  const variables = readVariables(args.variables);
  if (prompt === undefined && variables === undefined) return undefined;
  return { prompt, variables };
}

function readVariables(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value)) throw new Error("Tool argument variables must be an object.");

  return Object.fromEntries(Object.entries(value).map(readVariableEntry));
}

function readVariableEntry(entry: [string, unknown]): [string, string] {
  if (typeof entry[1] !== "string") throw new Error(`Workflow variable must be a string: ${entry[0]}`);
  return [entry[0], entry[1]];
}

function formatDefinitions(definitions: readonly WorkflowDefinition[]): string {
  if (definitions.length === 0) return "No workflows.";
  return definitions.map(formatDefinition).join("\n\n");
}

function formatDefinition(definition: WorkflowDefinition): string {
  return [
    `${definition.id} [${definition.source}] ${definition.name}`,
    definition.description === undefined ? "" : `description: ${definition.description}`,
    `steps: ${definition.steps.length}`,
    ...definition.steps.map(formatStep)
  ].filter(Boolean).join("\n");
}

function formatStep(step: WorkflowStep): string {
  return `- ${step.type} ${step.name}`;
}

function formatRun(run: WorkflowRun): string {
  return [
    run.status,
    `workflow: ${run.definitionName} (${run.definitionId})`,
    `steps: ${run.stepResults.length}`,
    run.error === undefined ? "" : `error: ${run.error}`,
    ...run.stepResults.map(formatStepResult)
  ].filter(Boolean).join("\n");
}

function formatStepResult(result: WorkflowStepResult): string {
  return [
    `- ${result.status} ${result.type} ${result.stepName}`,
    result.error === undefined ? "" : `  error: ${result.error}`,
    result.output.trimEnd() === "" ? "" : `  output:\n${indent(result.output.trimEnd())}`
  ].filter(Boolean).join("\n");
}

function indent(value: string): string {
  return value.split("\n").map((line) => `    ${line}`).join("\n");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireProvider(provider: AgentWorkflowToolProvider | undefined): AgentWorkflowToolProvider {
  if (provider === undefined) throw new Error("Workflow tools are not configured.");
  return provider;
}
