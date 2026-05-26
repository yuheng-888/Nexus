import { describe, expect, it } from "vitest";
import type { GitCommandResult, GitHubPublishRequest, GitHubPublishResult, GitPublishSafetyReport } from "../src/gitContracts.js";
import { NativeAgentGitHubPublishToolProvider, type GitHubPublishToolService } from "../src/main/agentGitHubPublishTools.js";

class FakeGitHubPublishService implements GitHubPublishToolService {
  requests: GitHubPublishRequest[] = [];

  async publishSafetyScan(): Promise<GitPublishSafetyReport> {
    return {
      blocked: true,
      checkedFiles: 3,
      findings: [{ message: "Contains a local /Users path", path: "README.md", severity: "blocker", type: "file-content" }]
    };
  }

  async publishToGitHub(request: GitHubPublishRequest): Promise<GitHubPublishResult> {
    this.requests = [...this.requests, request];
    return {
      branch: request.branch ?? "main",
      commit: gitResult("created commit"),
      init: null,
      push: gitResult("pushed"),
      remote: gitResult("origin set"),
      remoteAction: "added",
      remoteName: request.remoteName ?? "origin",
      repository: {
        cloneUrl: "https://github.com/nexus/demo.git",
        fullName: "nexus/demo",
        htmlUrl: "https://github.com/nexus/demo",
        name: request.name,
        private: request.visibility === "private",
        sshUrl: "git@github.com:nexus/demo.git"
      },
      safety: { blocked: false, checkedFiles: 10, findings: [] }
    };
  }
}

describe("NativeAgentGitHubPublishToolProvider", () => {
  it("formats safety scans and publish results without echoing tokens", async () => {
    const service = new FakeGitHubPublishService();
    const provider = new NativeAgentGitHubPublishToolProvider({ service });
    const args = { branch: "main", name: "demo", token: "secret-token", visibility: "public" };

    const scan = await provider.publishSafetyScan();
    const preview = await provider.previewPublishRepository(args);
    const result = await provider.publishRepository(args);

    expect(scan).toContain("blocked: true");
    expect(scan).toContain("README.md: Contains a local /Users path");
    expect(preview).toContain("Publish GitHub repository: demo");
    expect(result).toContain("repository: nexus/demo");
    expect(result).toContain("push: exitCode=0 pushed");
    expect(`${preview}\n${result}`).not.toContain("secret-token");
    expect(service.requests).toEqual([{ branch: "main", name: "demo", token: "secret-token", visibility: "public" }]);
  });
});

function gitResult(stdout: string): GitCommandResult {
  return { exitCode: 0, stderr: "", stdout };
}
