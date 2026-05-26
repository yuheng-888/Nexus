import type {
  GitCommandResult,
  GitHubPublishRequest,
  GitHubPublishResult,
  GitHubRepositoryVisibility,
  GitPublishSafetyFinding,
  GitPublishSafetyReport
} from "../gitContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";

export interface AgentGitHubPublishToolProvider {
  previewPublishRepository(args: Record<string, unknown>): Promise<string>;
  publishRepository(args: Record<string, unknown>): Promise<string>;
  publishSafetyScan(): Promise<string>;
}

export interface GitHubPublishToolService {
  publishSafetyScan(): Promise<GitPublishSafetyReport>;
  publishToGitHub(request: GitHubPublishRequest): Promise<GitHubPublishResult>;
}

export class NativeAgentGitHubPublishToolProvider implements AgentGitHubPublishToolProvider {
  private readonly service: GitHubPublishToolService;

  constructor(options: { readonly service: GitHubPublishToolService }) {
    this.service = options.service;
  }

  async previewPublishRepository(args: Record<string, unknown>): Promise<string> {
    const request = readPublishRequest(args);
    return [
      `Publish GitHub repository: ${request.name}`,
      `visibility: ${request.visibility}`,
      `branch: ${request.branch ?? "main"}`,
      `remote: ${request.remoteName ?? "origin"}`,
      `commitMessage: ${request.commitMessage ?? "Initial publish"}`
    ].join("\n");
  }

  async publishRepository(args: Record<string, unknown>): Promise<string> {
    return formatPublishResult(await this.service.publishToGitHub(readPublishRequest(args)));
  }

  async publishSafetyScan(): Promise<string> {
    return formatSafetyReport(await this.service.publishSafetyScan());
  }
}

export function createGitHubPublishToolSpecs(
  provider: AgentGitHubPublishToolProvider | undefined
): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "Run the GitHub publish safety scan for the current workspace.",
      name: "github.publish_safety_scan",
      parameters: "none",
      permission: "read",
      run: () => requireProvider(provider).publishSafetyScan()
    },
    {
      description: "Create a GitHub repository and publish the current workspace.",
      name: "github.publish_repository",
      parameters: "token: string, name: string, visibility: public|private, branch?: string, commitMessage?: string, description?: string, remoteName?: string, authorName?: string, authorEmail?: string",
      permission: "write",
      preview: (args) => requireProvider(provider).previewPublishRepository(args),
      run: (args) => requireProvider(provider).publishRepository(args)
    }
  ];
}

function readPublishRequest(args: Record<string, unknown>): GitHubPublishRequest {
  return {
    authorEmail: readOptionalString(args, "authorEmail"),
    authorName: readOptionalString(args, "authorName"),
    branch: readOptionalString(args, "branch"),
    commitMessage: readOptionalString(args, "commitMessage"),
    description: readOptionalString(args, "description"),
    name: readRequiredString(args, "name"),
    remoteName: readOptionalString(args, "remoteName"),
    token: readRequiredString(args, "token"),
    visibility: readVisibility(args)
  };
}

function readVisibility(args: Record<string, unknown>): GitHubRepositoryVisibility {
  const value = readRequiredString(args, "visibility");
  if (value === "public" || value === "private") return value;
  throw new Error(`Unsupported GitHub repository visibility: ${value}`);
}

function formatPublishResult(result: GitHubPublishResult): string {
  return [
    "published",
    `repository: ${result.repository.fullName}`,
    `url: ${result.repository.htmlUrl}`,
    `visibility: ${result.repository.private ? "private" : "public"}`,
    `branch: ${result.branch}`,
    `remote: ${result.remoteName} (${result.remoteAction})`,
    `safety: ${result.safety.blocked ? "blocked" : "passed"}; checkedFiles=${result.safety.checkedFiles}`,
    result.init === null ? "gitInit: skipped" : `gitInit: ${formatCommandSummary(result.init)}`,
    result.commit === null ? "commit: skipped" : `commit: ${formatCommandSummary(result.commit)}`,
    `push: ${formatCommandSummary(result.push)}`
  ].join("\n");
}

function formatSafetyReport(report: GitPublishSafetyReport): string {
  return [
    `blocked: ${report.blocked}`,
    `checkedFiles: ${report.checkedFiles}`,
    `findings: ${report.findings.length}`,
    ...report.findings.map(formatFinding)
  ].join("\n");
}

function formatFinding(finding: GitPublishSafetyFinding): string {
  return `${finding.severity} ${finding.type} ${finding.path}: ${finding.message}`;
}

function formatCommandSummary(result: GitCommandResult): string {
  const output = result.stdout.trim() || result.stderr.trim();
  return output === "" ? `exitCode=${result.exitCode}` : `exitCode=${result.exitCode} ${output}`;
}

function requireProvider(provider: AgentGitHubPublishToolProvider | undefined): AgentGitHubPublishToolProvider {
  if (provider === undefined) throw new Error("GitHub publish tools are not configured.");
  return provider;
}
