import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { createGitReadToolSpecs } from "./agentGitReadTools.js";
import { createGitWriteToolSpecs } from "./agentGitWriteTools.js";

export function createGitToolSpecs(): readonly AgentInteractiveToolSpec[] {
  return [...createGitReadToolSpecs(), ...createGitWriteToolSpecs()];
}
