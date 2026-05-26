import type { GitPushRequest, GitSummary } from "../../types/git";
import type { GitDataStore } from "./useGitDataState";
import type { GitPanelState } from "./gitPanelStateTypes";

type GitRun = GitPanelState["run"];

export interface GitPanelActionOptions {
  readonly choose: GitPanelState["choose"];
  readonly commit: GitPanelState["commit"];
  readonly data: GitDataStore;
  readonly refresh: GitPanelState["refresh"];
  readonly run: GitRun;
}

export function createGitPanelActions(options: GitPanelActionOptions) {
  const { data, run } = options;

  return {
    abortMerge: () => run("abortMerge", () => window.nexus.git.abortMerge()),
    abortRebase: () => run("abortRebase", () => window.nexus.git.abortRebase()),
    addRemote: (name: string, url: string) => run("addRemote", () => window.nexus.git.addRemote({ name, url })),
    checkoutBranch: (branch: string) => run("checkout", () => window.nexus.git.checkoutBranch({ branch })),
    choose: options.choose,
    commit: options.commit,
    createBranch: (name: string) => run("createBranch", () => window.nexus.git.createBranch({ name })),
    createTag: (name: string, message?: string) => run("createTag", () => window.nexus.git.createTag({ name, message })),
    deleteBranch: (name: string) => run("deleteBranch", () => window.nexus.git.deleteBranch({ name })),
    deleteTag: (name: string) => run("deleteTag", () => window.nexus.git.deleteTag(name)),
    fetchRemote: (remote?: string) => run("fetch", () => window.nexus.git.fetch({ remote })),
    mergeBranch: (branch: string) => run("merge", () => window.nexus.git.merge(branch)),
    pullRemote: (remote?: string) => run("pull", () => window.nexus.git.pull({ remote })),
    pushRemote: (remote?: string) => run("push", () => window.nexus.git.push(pushRequest(remote, data.summary))),
    rebaseBranch: (branch: string) => run("rebase", () => window.nexus.git.rebase(branch)),
    refresh: options.refresh,
    removeRemote: (name: string) => run("removeRemote", () => window.nexus.git.removeRemote(name)),
    run,
    setCommitMessage: data.setCommitMessage,
    showCommit: (ref: string) => run("show", () => window.nexus.git.show(ref)),
    stashApply: (ref?: string) => run("stashApply", () => window.nexus.git.stashApply(ref)),
    stashDrop: (ref?: string) => run("stashDrop", () => window.nexus.git.stashDrop(ref)),
    stashPop: (ref?: string) => run("stashPop", () => window.nexus.git.stashPop(ref)),
    stashPush: (message?: string, includeUntracked?: boolean) => run("stashPush", () => window.nexus.git.stashPush({ includeUntracked, message }))
  };
}

function pushRequest(remote: string | undefined, summary: GitSummary | null): GitPushRequest {
  const branch = summary?.branch.current;
  return { branch, remote, setUpstream: remote !== undefined && branch !== undefined && branch !== "" };
}
