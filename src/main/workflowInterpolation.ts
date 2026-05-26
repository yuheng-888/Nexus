import type { WorkflowRunInput } from "../workflowContracts.js";

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function interpolateWorkflowText(text: string, input: WorkflowRunInput | undefined): string {
  return text.replace(TOKEN_PATTERN, (_token, key: string) => valueForKey(key, input));
}

function valueForKey(key: string, input: WorkflowRunInput | undefined): string {
  if (key === "prompt") return input?.prompt ?? "";
  return input?.variables?.[key] ?? "";
}
