import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";

class FakeGitHubPullRequestProvider {
  createArgs: Record<string, unknown>[] = [];
  reviewArgs: Record<string, unknown>[] = [];
  listArgs: Record<string, unknown>[] = [];

  async createPullRequest(args: Record<string, unknown>): Promise<string> {
    this.createArgs = [...this.createArgs, args];
    return "PR #7: Add native agent\n链接: https://github.com/nexus/demo/pull/7";
  }

  async listPullRequests(args: Record<string, unknown>): Promise<string> {
    this.listArgs = [...this.listArgs, args];
    return "PR #7: Add native agent\n分支: feature/native-agent -> main";
  }

  async listPullRequestReviews(args: Record<string, unknown>): Promise<string> {
    this.reviewArgs = [...this.reviewArgs, args];
    return "Review #1: APPROVED by reviewer";
  }

  async previewCreatePullRequest(args: Record<string, unknown>): Promise<string> {
    return `Create GitHub PR: ${String(args.title)}`;
  }
}

describe("NativeAgentInteractiveToolRunner GitHub PR tools", () => {
  it("lists pull requests and reviews as read-only native tools", async () => {
    const provider = new FakeGitHubPullRequestProvider();
    const runner = new NativeAgentInteractiveToolRunner({ gitHubPullRequests: provider });

    const pulls = await runner.runToolCall(toolCall("github.pr.list", { state: "open", token: "test-token" }), fakeContext());
    const reviews = await runner.runToolCall(toolCall("github.pr.reviews", { number: 7, token: "test-token" }), fakeContext());

    expect(runner.getToolDefinition("github.pr.list")).toMatchObject({ permission: "read" });
    expect(runner.getToolDefinition("github.pr.reviews")).toMatchObject({ permission: "read" });
    expect(pulls).toEqual({ name: "github.pr.list", ok: true, output: "PR #7: Add native agent\n分支: feature/native-agent -> main" });
    expect(reviews).toEqual({ name: "github.pr.reviews", ok: true, output: "Review #1: APPROVED by reviewer" });
    expect(provider.listArgs).toEqual([{ state: "open", token: "test-token" }]);
    expect(provider.reviewArgs).toEqual([{ number: 7, token: "test-token" }]);
  });

  it("marks pull request creation as an approval-gated write tool", async () => {
    const provider = new FakeGitHubPullRequestProvider();
    const runner = new NativeAgentInteractiveToolRunner({ gitHubPullRequests: provider });
    const call = toolCall("github.pr.create", { title: "Add native agent", token: "test-token" });

    const preview = await runner.previewToolCall(call, fakeContext());
    const result = await runner.runToolCall(call, fakeContext());

    expect(runner.getToolDefinition("github.pr.create")).toMatchObject({ permission: "write" });
    expect(preview).toBe("Create GitHub PR: Add native agent");
    expect(result).toEqual({
      name: "github.pr.create",
      ok: true,
      output: "PR #7: Add native agent\n链接: https://github.com/nexus/demo/pull/7"
    });
    expect(provider.createArgs).toEqual([{ title: "Add native agent", token: "test-token" }]);
  });
});

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}

function fakeContext(): AgentInteractiveToolContext {
  return {
    cwd: ".",
    files: {} as AgentInteractiveToolContext["files"],
    git: {} as AgentInteractiveToolContext["git"],
    prompt: "",
    search: {} as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}
