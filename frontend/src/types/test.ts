export type TestRunnerKind = "npm";
export type TestRunScope = "all" | "file";

export interface TestFile {
  readonly framework: string;
  readonly name: string;
  readonly path: string;
}

export interface TestDiscoveryResult {
  readonly command: string;
  readonly files: readonly TestFile[];
  readonly runner: TestRunnerKind;
}

export interface TestRunRequest {
  readonly path?: string;
  readonly scope: TestRunScope;
}

export interface TestRunResult {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly passed: boolean;
  readonly stderr: string;
  readonly stdout: string;
}

export interface TestApi {
  discover(): Promise<TestDiscoveryResult>;
  run(request: TestRunRequest): Promise<TestRunResult>;
}
