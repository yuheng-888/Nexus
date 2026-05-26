import { describe, expect, it } from "vitest";
import type { SessionSnapshot, SubagentProfile, SubagentRun } from "../src/contracts.js";
import type { AgentRuntimeService } from "../src/main/agentRuntimeService.js";
import { SubagentService } from "../src/main/subagentService.js";

describe("SubagentService", () => {
  it("starts Nexus subagents through the native runtime", () => {
    const runtime = new FakeRuntime();
    const service = new SubagentService(runtime as unknown as AgentRuntimeService);

    const run = service.start({
      options: { profileId: "reviewer", prompt: "review current diff" },
      workspaceRoot: "/workspace"
    });

    expect(run.profile.id).toBe("reviewer");
    expect(run.session.kind).toBe("subagent");
    expect(run.session.command).toBe("nexus-agent-runtime");
    expect(run.session.args.join(" ")).not.toMatch(/claude|codex|cli\.js|node/i);
    expect(runtime.starts[0]?.profile?.id).toBe("reviewer");
  });
});

class FakeRuntime {
  readonly starts: {
    readonly profile?: SubagentProfile;
    readonly prompt: string;
    readonly workspaceRoot: string;
  }[] = [];

  start(input: {
    readonly profile?: SubagentProfile;
    readonly prompt: string;
    readonly workspaceRoot: string;
  }): SessionSnapshot {
    this.starts.push(input);
    return {
      args: ["subagent", input.profile?.id ?? "main"],
      command: "nexus-agent-runtime",
      cwd: input.workspaceRoot,
      id: "session-1",
      kind: "subagent"
    };
  }
}
