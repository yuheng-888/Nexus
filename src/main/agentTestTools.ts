import type { TestDiscoveryResult, TestFile, TestRunRequest, TestRunResult, TestRunScope } from "../testContracts.js";
import type { AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString } from "./agentToolArgs.js";
import type { TestService } from "./testService.js";

export interface AgentTestToolProvider {
  discoverTests(): Promise<string>;
  previewRunTests(args: Record<string, unknown>): Promise<string>;
  runTests(args: Record<string, unknown>): Promise<string>;
}

export class NativeAgentTestToolProvider implements AgentTestToolProvider {
  private readonly service: TestService;

  constructor(options: { readonly service: TestService }) {
    this.service = options.service;
  }

  async discoverTests(): Promise<string> {
    return formatDiscovery(await this.service.discover());
  }

  async previewRunTests(args: Record<string, unknown>): Promise<string> {
    return `Run tests: ${formatRunRequest(readRunRequest(args))}`;
  }

  async runTests(args: Record<string, unknown>): Promise<string> {
    return formatRunResult(await this.service.run(readRunRequest(args)));
  }
}

export function createTestToolSpecs(provider: AgentTestToolProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "Discover test files and the configured project test command.",
      name: "tests.discover",
      parameters: "none",
      permission: "read",
      run: () => requireProvider(provider).discoverTests()
    },
    {
      description: "Run all tests or one test file through the project test command.",
      name: "tests.run",
      parameters: "scope: all|file, path?: string",
      permission: "write",
      preview: (args) => requireProvider(provider).previewRunTests(args),
      run: (args) => requireProvider(provider).runTests(args)
    }
  ];
}

function readRunRequest(args: Record<string, unknown>): TestRunRequest {
  const scope = readScope(args);
  return {
    path: readOptionalString(args, "path"),
    scope
  };
}

function readScope(args: Record<string, unknown>): TestRunScope {
  const scope = readOptionalString(args, "scope") ?? "all";
  if (scope === "all" || scope === "file") return scope;
  throw new Error(`Unsupported test scope: ${scope}`);
}

function formatDiscovery(discovery: TestDiscoveryResult): string {
  return [
    `command: ${discovery.command}`,
    `runner: ${discovery.runner}`,
    `files: ${discovery.files.length}`,
    ...discovery.files.map(formatFile)
  ].join("\n");
}

function formatFile(file: TestFile): string {
  return `${file.path} (${file.framework})`;
}

function formatRunRequest(request: TestRunRequest): string {
  return request.scope === "all" ? "all" : `file ${request.path ?? "<missing>"}`;
}

function formatRunResult(result: TestRunResult): string {
  return [
    result.passed ? "passed" : `failed exitCode=${result.exitCode}`,
    `command: ${result.command}`,
    `durationMs: ${result.durationMs}`,
    result.stdout.trimEnd() === "" ? "stdout: <empty>" : `stdout:\n${result.stdout.trimEnd()}`,
    result.stderr.trimEnd() === "" ? "" : `stderr:\n${result.stderr.trimEnd()}`
  ].filter(Boolean).join("\n");
}

function requireProvider(provider: AgentTestToolProvider | undefined): AgentTestToolProvider {
  if (provider === undefined) throw new Error("Test tools are not configured.");
  return provider;
}
