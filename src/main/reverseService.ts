import type {
  ReverseAnalysisRequest,
  ReverseAnalysisResult,
  ReverseAsarDiffRequest,
  ReverseAsarDiffResult,
  ReverseAsarExtractRequest,
  ReverseAsarExtractResult,
  ReverseAsarInspectRequest,
  ReverseAsarInspectResult,
  ReverseAsarPackRequest,
  ReverseAsarPackResult,
  ReverseJsHookGenerateRequest,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectRequest,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreRequest,
  ReverseJsHookRestoreResult,
  ReverseProject,
  ReverseProjectDraft,
  ReverseTargetDetection
} from "../reverseContracts.js";
import { AsarService } from "./asarService.js";
import { JavaScriptAnalysisService } from "./javascriptAnalysisService.js";
import { JavaScriptHookService } from "./javascriptHookService.js";
import { ReverseProjectService } from "./reverseProjectService.js";
import { ReverseTargetService } from "./reverseTargetService.js";

export interface ReverseServiceOptions {
  readonly analysis?: JavaScriptAnalysisService;
  readonly asar?: AsarService;
  readonly jshook?: JavaScriptHookService;
  readonly projects?: ReverseProjectService;
  readonly targets?: ReverseTargetService;
}

export class ReverseService {
  private readonly analysis: JavaScriptAnalysisService;
  private readonly asar: AsarService;
  private readonly jshook: JavaScriptHookService;
  private readonly projects: ReverseProjectService;
  private readonly targets: ReverseTargetService;

  constructor(options: ReverseServiceOptions = {}) {
    this.analysis = options.analysis ?? new JavaScriptAnalysisService();
    this.asar = options.asar ?? new AsarService();
    this.jshook = options.jshook ?? new JavaScriptHookService();
    this.projects = options.projects ?? new ReverseProjectService();
    this.targets = options.targets ?? new ReverseTargetService();
  }

  detectTarget(path: string): Promise<ReverseTargetDetection> {
    return this.targets.detect(path);
  }

  inspectAsar(request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult> {
    return this.asar.inspect(request);
  }

  extractAsar(request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult> {
    return this.asar.extract(request);
  }

  packAsar(request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult> {
    return this.asar.pack(request);
  }

  diffAsar(request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult> {
    return this.asar.diff(request);
  }

  scanJavaScript(request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult> {
    return this.analysis.scan(request);
  }

  generateJavaScriptHook(request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult> {
    return this.jshook.generate(request);
  }

  injectJavaScriptHook(request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult> {
    return this.jshook.inject(request);
  }

  restoreJavaScriptHook(request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult> {
    return this.jshook.restore(request);
  }

  listProjects(): Promise<readonly ReverseProject[]> {
    return this.projects.listProjects();
  }

  async addProject(draft: ReverseProjectDraft): Promise<ReverseProject> {
    const detected = await this.detectTarget(draft.targetPath);
    return this.projects.addProject({ draft, targetType: detected.type });
  }

  removeProject(id: string): Promise<boolean> {
    return this.projects.removeProject(id);
  }
}
