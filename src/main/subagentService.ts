import { randomUUID } from "node:crypto";
import type { SubagentProfile, SubagentRun, SubagentStartOptions } from "../contracts.js";
import { buildSubagentPrompt, getSubagentProfiles } from "./subagentProfiles.js";
import type { AgentRuntimeService } from "./agentRuntimeService.js";

export interface SubagentStartInput {
  readonly options: SubagentStartOptions;
  readonly workspaceRoot: string | null;
}

interface ManagedSubagentRun extends SubagentRun {
  readonly sessionId: string;
}

export class SubagentService {
  private readonly runs = new Map<string, ManagedSubagentRun>();
  private readonly runtime: AgentRuntimeService;

  constructor(runtime: AgentRuntimeService) {
    this.runtime = runtime;
  }

  getProfiles(): readonly SubagentProfile[] {
    return getSubagentProfiles();
  }

  listRuns(): readonly SubagentRun[] {
    return [...this.runs.values()].map(toPublicRun);
  }

  start(input: SubagentStartInput): SubagentRun {
    const prepared = buildSubagentPrompt(input.options.profileId, input.options.prompt);
    const session = this.runtime.start({
      attachments: input.options.attachments,
      conversationId: input.options.conversationId,
      conversationPrompt: input.options.prompt,
      cwd: input.options.cwd,
      kind: "subagent",
      model: input.options.model,
      profile: prepared.profile,
      prompt: prepared.prompt,
      workspaceRoot: input.workspaceRoot
    });
    const run = createRun(session.id, prepared.profile, input.options.prompt, session);

    this.runs.set(run.id, run);
    return toPublicRun(run);
  }

  handleSessionExit(sessionId: string, exitCode: number): void {
    const run = [...this.runs.values()].find((item) => item.sessionId === sessionId);
    if (run === undefined) {
      return;
    }

    this.runs.set(run.id, { ...run, exitCode, status: "exited" });
  }
}

function createRun(
  sessionId: string,
  profile: SubagentProfile,
  prompt: string,
  session: SubagentRun["session"]
): ManagedSubagentRun {
  return {
    id: randomUUID(),
    profile,
    prompt,
    session,
    sessionId,
    startedAt: Date.now(),
    status: "running"
  };
}

function toPublicRun(run: ManagedSubagentRun): SubagentRun {
  const { sessionId: _sessionId, ...publicRun } = run;
  return publicRun;
}
