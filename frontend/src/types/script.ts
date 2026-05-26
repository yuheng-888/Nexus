export type ScriptPackageManager = "npm";

export interface ProjectScript {
  readonly command: string;
  readonly name: string;
}

export interface ScriptDiscoveryResult {
  readonly packageManager: ScriptPackageManager;
  readonly scripts: readonly ProjectScript[];
}

export interface ScriptRunRequest {
  readonly name: string;
}

export interface ScriptRunResult {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly passed: boolean;
  readonly script: ProjectScript;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ScriptApi {
  discover(): Promise<ScriptDiscoveryResult>;
  run(request: ScriptRunRequest): Promise<ScriptRunResult>;
}
