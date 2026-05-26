export type ReverseTargetType = "asar" | "electron-app" | "node-project" | "javascript-bundle" | "unknown";
export type ReverseAsarEntryType = "directory" | "file" | "link";
export type ReverseAsarChangeType = "added" | "modified" | "removed";
export type ReverseAnalysisFindingType =
  | "child-process"
  | "dependency"
  | "dynamic-execution"
  | "electron-ipc"
  | "network"
  | "storage";
export type ReverseAnalysisSeverity = "critical" | "info" | "warning";
export type ReverseJsHookFeature =
  | "child-process"
  | "electron-ipc"
  | "fetch"
  | "storage"
  | "websocket"
  | "xhr";

export interface ReverseTargetDetection {
  readonly absolutePath: string;
  readonly confidence: number;
  readonly name: string;
  readonly path: string;
  readonly signals: readonly string[];
  readonly type: ReverseTargetType;
}

export interface ReverseAsarInspectRequest {
  readonly archivePath: string;
}

export interface ReverseAsarExtractRequest extends ReverseAsarInspectRequest {
  readonly destinationPath: string;
}

export interface ReverseAsarPackRequest {
  readonly archivePath: string;
  readonly sourceDirectory: string;
}

export interface ReverseAsarDiffRequest {
  readonly afterPath: string;
  readonly beforePath: string;
}

export interface ReverseAsarEntry {
  readonly integrityHash?: string;
  readonly name: string;
  readonly path: string;
  readonly size?: number;
  readonly type: ReverseAsarEntryType;
}

export interface ReverseAsarInspectResult {
  readonly archivePath: string;
  readonly directories: number;
  readonly entries: readonly ReverseAsarEntry[];
  readonly files: number;
  readonly totalSize: number;
}

export interface ReverseAsarExtractResult {
  readonly archivePath: string;
  readonly destinationPath: string;
  readonly extractedFiles: number;
}

export interface ReverseAsarPackResult {
  readonly archivePath: string;
  readonly packedFiles: number;
  readonly sourceDirectory: string;
}

export interface ReverseAsarDiffEntry {
  readonly after?: ReverseAsarEntry;
  readonly before?: ReverseAsarEntry;
  readonly change: ReverseAsarChangeType;
  readonly path: string;
}

export interface ReverseAsarDiffResult {
  readonly added: number;
  readonly afterPath: string;
  readonly beforePath: string;
  readonly entries: readonly ReverseAsarDiffEntry[];
  readonly modified: number;
  readonly removed: number;
}

export interface ReverseAnalysisRequest {
  readonly maxFileBytes?: number;
  readonly path: string;
}

export interface ReverseAnalysisDependency {
  readonly absolutePath: string;
  readonly importKind: "dynamic-import" | "import" | "require";
  readonly line: number;
  readonly name: string;
  readonly path: string;
}

export interface ReverseAnalysisFinding {
  readonly absolutePath: string;
  readonly line: number;
  readonly message: string;
  readonly path: string;
  readonly severity: ReverseAnalysisSeverity;
  readonly snippet: string;
  readonly type: ReverseAnalysisFindingType;
}

export interface ReverseAnalysisSkippedFile {
  readonly absolutePath: string;
  readonly message: string;
  readonly path: string;
}

export interface ReverseAnalysisResult {
  readonly dependencies: readonly ReverseAnalysisDependency[];
  readonly findings: readonly ReverseAnalysisFinding[];
  readonly scannedFiles: number;
  readonly skippedFiles: readonly ReverseAnalysisSkippedFile[];
  readonly targetPath: string;
}

export interface ReverseProject {
  readonly createdAt: number;
  readonly id: string;
  readonly name: string;
  readonly notes?: string;
  readonly targetPath: string;
  readonly targetType: ReverseTargetType;
  readonly updatedAt: number;
}

export interface ReverseProjectDraft {
  readonly name: string;
  readonly notes?: string;
  readonly targetPath: string;
}

export interface ReverseJsHookGenerateRequest {
  readonly hookFilename?: string;
  readonly outputDirectory: string;
}

export interface ReverseJsHookGenerateResult {
  readonly features: readonly ReverseJsHookFeature[];
  readonly hookFilename: string;
  readonly hookPath: string;
  readonly sourceLength: number;
}

export interface ReverseJsHookInjectRequest {
  readonly entryPath?: string;
  readonly hookFilename?: string;
  readonly targetPath: string;
}

export interface ReverseJsHookInjectResult {
  readonly backupPath: string;
  readonly bootstrapLine: string;
  readonly entryPath: string;
  readonly hookPath: string;
  readonly marker: string;
  readonly targetPath: string;
}

export interface ReverseJsHookRestoreRequest {
  readonly backupPath: string;
  readonly entryPath: string;
}

export interface ReverseJsHookRestoreResult {
  readonly backupPath: string;
  readonly entryPath: string;
  readonly restored: boolean;
}

export interface NexusReverseApi {
  asar: {
    diff(request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult>;
    extract(request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult>;
    inspect(request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult>;
    pack(request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult>;
  };
  analysis: {
    scan(request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult>;
  };
  projects: {
    add(draft: ReverseProjectDraft): Promise<ReverseProject>;
    list(): Promise<readonly ReverseProject[]>;
    remove(id: string): Promise<boolean>;
  };
  jshook: {
    generate(request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult>;
    inject(request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult>;
    restore(request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult>;
  };
  target: {
    detect(path: string): Promise<ReverseTargetDetection>;
  };
}
