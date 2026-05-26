import type {
  ReverseAnalysisResult,
  ReverseAsarDiffResult,
  ReverseAsarExtractResult,
  ReverseAsarInspectResult,
  ReverseAsarPackResult,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreResult,
  ReverseProject,
  ReverseTargetDetection
} from "../../types/reverse";

export type ReversePanelAction =
  | ""
  | "add-project"
  | "detect"
  | "diff"
  | "extract"
  | "generate-hook"
  | "inject-hook"
  | "inspect"
  | "pack"
  | "projects"
  | "reveal"
  | "restore-hook"
  | "scan";

export interface ReversePanelState {
  readonly action: ReversePanelAction;
  readonly analysis: ReverseAnalysisResult | null;
  readonly asarDiff: ReverseAsarDiffResult | null;
  readonly asarExtract: ReverseAsarExtractResult | null;
  readonly asarInspect: ReverseAsarInspectResult | null;
  readonly asarPack: ReverseAsarPackResult | null;
  readonly backupPath: string;
  readonly comparePath: string;
  readonly entryPath: string;
  readonly error: string;
  readonly hookFilename: string;
  readonly hookGenerate: ReverseJsHookGenerateResult | null;
  readonly hookInject: ReverseJsHookInjectResult | null;
  readonly hookRestore: ReverseJsHookRestoreResult | null;
  readonly message: string;
  readonly notes: string;
  readonly outputPath: string;
  readonly projects: readonly ReverseProject[];
  readonly target: ReverseTargetDetection | null;
  readonly targetPath: string;
  addProject(): Promise<void>;
  detectTarget(): Promise<void>;
  diffAsar(): Promise<void>;
  extractAsar(): Promise<void>;
  generateHook(): Promise<void>;
  injectHook(): Promise<void>;
  inspectAsar(): Promise<void>;
  packAsar(): Promise<void>;
  refreshProjects(): Promise<void>;
  removeProject(id: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  restoreHook(): Promise<void>;
  scanJavaScript(): Promise<void>;
  pickBackupPath(): Promise<void>;
  pickComparePath(): Promise<void>;
  pickEntryPath(): Promise<void>;
  pickOutputAsarPath(): Promise<void>;
  pickOutputDirectory(): Promise<void>;
  pickTargetPath(): Promise<void>;
  setBackupPath(path: string): void;
  setComparePath(path: string): void;
  setEntryPath(path: string): void;
  setHookFilename(filename: string): void;
  setNotes(notes: string): void;
  setOutputPath(path: string): void;
  setTargetPath(path: string): void;
}
