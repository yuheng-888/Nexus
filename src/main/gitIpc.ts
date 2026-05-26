import { ipcMain } from "electron";
import type {
  GitBranchCheckoutRequest,
  GitBranchCreateRequest,
  GitBranchDeleteRequest,
  GitDiffRequest,
  GitFetchRequest,
  GitHubPublishRequest,
  GitInitRequest,
  GitLogRequest,
  GitPullRequest,
  GitPushRequest,
  GitRemoteRequest,
  GitStashPushRequest,
  GitTagCreateRequest
} from "../gitContracts.js";
import type { NexusBackend } from "./nexusBackend.js";

export function registerGitHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:git:status", (_event, cwd?: string) => backend.git.status(cwd));
  ipcMain.handle("nexus:git:summary", (_event, cwd?: string) => backend.git.summary(cwd));
  ipcMain.handle("nexus:git:branches", (_event, cwd?: string) => backend.git.branches(cwd));
  ipcMain.handle("nexus:git:listBranches", (_event, cwd?: string) => backend.git.listBranches(cwd));
  ipcMain.handle("nexus:git:diff", (_event, request: GitDiffRequest) => backend.git.diff(request));
  ipcMain.handle("nexus:git:stage", (_event, path: string) => backend.git.stage(path));
  ipcMain.handle("nexus:git:unstage", (_event, path: string) => backend.git.unstage(path));
  ipcMain.handle("nexus:git:stageAll", () => backend.git.stageAll());
  ipcMain.handle("nexus:git:unstageAll", () => backend.git.unstageAll());
  ipcMain.handle("nexus:git:commit", (_event, message: string) => backend.git.commit(message));
  ipcMain.handle("nexus:git:remotes", (_event, cwd?: string) => backend.git.remotes(cwd));
  ipcMain.handle("nexus:git:addRemote", (_event, request: GitRemoteRequest) => backend.git.addRemote(request));
  ipcMain.handle("nexus:git:removeRemote", (_event, name: string) => backend.git.removeRemote(name));
  ipcMain.handle("nexus:git:fetch", (_event, request?: GitFetchRequest) => backend.git.fetch(request));
  ipcMain.handle("nexus:git:init", (_event, request?: GitInitRequest) => backend.git.init(request));
  ipcMain.handle("nexus:git:pull", (_event, request?: GitPullRequest) => backend.git.pull(request));
  ipcMain.handle("nexus:git:publishSafetyScan", () => backend.gitPublish.publishSafetyScan());
  ipcMain.handle("nexus:git:publishToGitHub", (_event, request: GitHubPublishRequest) => backend.gitPublish.publishToGitHub(request));
  ipcMain.handle("nexus:git:push", (_event, request?: GitPushRequest) => backend.git.push(request));
  ipcMain.handle("nexus:git:createBranch", (_event, request: GitBranchCreateRequest) => backend.git.createBranch(request));
  ipcMain.handle("nexus:git:checkoutBranch", (_event, request: GitBranchCheckoutRequest) => backend.git.checkoutBranch(request));
  ipcMain.handle("nexus:git:deleteBranch", (_event, request: GitBranchDeleteRequest) => backend.git.deleteBranch(request));
  ipcMain.handle("nexus:git:log", (_event, request?: GitLogRequest) => backend.git.log(request));
  ipcMain.handle("nexus:git:show", (_event, ref: string) => backend.git.show(ref));
  ipcMain.handle("nexus:git:merge", (_event, branch: string) => backend.git.merge(branch));
  ipcMain.handle("nexus:git:rebase", (_event, branch: string) => backend.git.rebase(branch));
  ipcMain.handle("nexus:git:abortMerge", () => backend.git.abortMerge());
  ipcMain.handle("nexus:git:abortRebase", () => backend.git.abortRebase());
  ipcMain.handle("nexus:git:stashList", () => backend.git.stashList());
  ipcMain.handle("nexus:git:stashPush", (_event, request?: GitStashPushRequest) => backend.git.stashPush(request));
  ipcMain.handle("nexus:git:stashApply", (_event, ref?: string) => backend.git.stashApply(ref));
  ipcMain.handle("nexus:git:stashPop", (_event, ref?: string) => backend.git.stashPop(ref));
  ipcMain.handle("nexus:git:stashDrop", (_event, ref?: string) => backend.git.stashDrop(ref));
  ipcMain.handle("nexus:git:discardFile", (_event, path: string) => backend.git.discardFile(path));
  ipcMain.handle("nexus:git:discardAll", () => backend.git.discardAll());
  ipcMain.handle("nexus:git:tagList", () => backend.git.tagList());
  ipcMain.handle("nexus:git:createTag", (_event, request: GitTagCreateRequest) => backend.git.createTag(request));
  ipcMain.handle("nexus:git:deleteTag", (_event, name: string) => backend.git.deleteTag(name));
}
