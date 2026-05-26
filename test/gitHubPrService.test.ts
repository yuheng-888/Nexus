import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitService } from "../src/main/gitService.js";
import { GitHubPrService } from "../src/main/gitHubPrService.js";

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-github-pr-"));
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("GitHubPrService", () => {
  it("creates a pull request from the current branch and origin remote", async () => {
    const requests: RecordedRequest[] = [];
    const service = new GitHubPrService({ fetch: recordingFetch(requests, prResponse()), git: git(), workspaceRoot });
    await git().init({ branch: "feature/native-agent" });
    await git().addRemote({ name: "origin", url: "https://github.com/nexus/demo.git" });

    const result = await service.createPullRequest({
      body: "Adds native agent support.",
      token: "test-token",
      title: "Add native agent"
    });

    expect(result).toMatchObject({
      baseRef: "main",
      headRef: "feature/native-agent",
      htmlUrl: "https://github.com/nexus/demo/pull/7",
      number: 7,
      state: "open",
      title: "Add native agent"
    });
    expect(requests[0]).toMatchObject({
      body: {
        base: "main",
        body: "Adds native agent support.",
        draft: false,
        head: "feature/native-agent",
        title: "Add native agent"
      },
      method: "POST",
      url: "https://api.github.com/repos/nexus/demo/pulls"
    });
  });

  it("lists pull requests and reviews for a repository", async () => {
    const requests: RecordedRequest[] = [];
    const service = new GitHubPrService({ fetch: recordingFetch(requests, pullListResponse(), reviewListResponse()), git: git(), workspaceRoot });
    await git().init({ branch: "main" });
    await git().addRemote({ name: "origin", url: "git@github.com:nexus/demo.git" });

    const pulls = await service.listPullRequests({ state: "open", token: "test-token" });
    const reviews = await service.listPullRequestReviews({ number: 7, token: "test-token" });

    expect(pulls).toEqual([expect.objectContaining({ number: 7, title: "Add native agent" })]);
    expect(reviews).toEqual([expect.objectContaining({ authorLogin: "reviewer", state: "APPROVED" })]);
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.github.com/repos/nexus/demo/pulls?state=open",
      "https://api.github.com/repos/nexus/demo/pulls/7/reviews"
    ]);
  });
});

interface RecordedRequest {
  readonly body: unknown;
  readonly method: string;
  readonly url: string;
}

function git(): GitService {
  return new GitService({ workspaceRoot });
}

function recordingFetch(requests: RecordedRequest[], ...responses: unknown[]): typeof fetch {
  return async (input, init) => {
    requests.push({
      body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      method: init?.method ?? "GET",
      url: String(input)
    });
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-token" });
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  };
}

function prResponse(): unknown {
  return {
    base: { ref: "main" },
    head: { ref: "feature/native-agent" },
    html_url: "https://github.com/nexus/demo/pull/7",
    number: 7,
    state: "open",
    title: "Add native agent",
    user: { login: "author" }
  };
}

function pullListResponse(): unknown {
  return [prResponse()];
}

function reviewListResponse(): unknown {
  return [{
    body: "Looks good",
    html_url: "https://github.com/nexus/demo/pull/7#pullrequestreview-1",
    id: 1,
    state: "APPROVED",
    submitted_at: "2026-05-26T12:00:00Z",
    user: { login: "reviewer" }
  }];
}
