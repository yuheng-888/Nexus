import { resolve } from "node:path";
import type { WorkspaceInfo } from "../contracts.js";

export interface RuntimeConfigInput {
  readonly appRoot: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
  readonly persistedWorkspaceRoot?: string | null;
}

export function createRuntimeConfig(input: RuntimeConfigInput): WorkspaceInfo {
  const root = getWorkspaceRoot(input);

  return {
    root: root === null ? null : resolve(root)
  };
}

function getWorkspaceRoot(input: RuntimeConfigInput): string | null {
  if (input.env.NEXUS_WORKSPACE_ROOT !== undefined) {
    return input.env.NEXUS_WORKSPACE_ROOT;
  }

  return input.persistedWorkspaceRoot ?? null;
}
