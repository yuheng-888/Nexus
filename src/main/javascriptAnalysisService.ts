import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import type {
  ReverseAnalysisDependency,
  ReverseAnalysisFinding,
  ReverseAnalysisFindingType,
  ReverseAnalysisRequest,
  ReverseAnalysisResult,
  ReverseAnalysisSeverity,
  ReverseAnalysisSkippedFile
} from "../reverseContracts.js";

interface SourceFile {
  readonly absolutePath: string;
  readonly path: string;
  readonly size: number;
}

interface ScanState {
  readonly dependencies: ReverseAnalysisDependency[];
  readonly findings: ReverseAnalysisFinding[];
  readonly skippedFiles: ReverseAnalysisSkippedFile[];
}

interface LineMatch {
  readonly message: string;
  readonly severity: ReverseAnalysisSeverity;
  readonly type: ReverseAnalysisFindingType;
}

interface DependencyMatchInput {
  readonly absolutePath: string;
  readonly importKind: ReverseAnalysisDependency["importKind"];
  readonly line: string;
  readonly lineNumber: number;
  readonly path: string;
  readonly pattern: RegExp;
}

interface PatternMatchInput {
  readonly line: string;
  readonly message: string;
  readonly pattern: RegExp;
  readonly severity: ReverseAnalysisSeverity;
  readonly type: ReverseAnalysisFindingType;
}

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const SCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const SKIPPED_DIRECTORIES = new Set([".git", "coverage", "dist", "node_modules", "out", "vendor"]);
const REQUIRE_PATTERN = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
const IMPORT_PATTERN = /\bimport\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

export class JavaScriptAnalysisService {
  async scan(request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult> {
    const targetPath = resolve(request.path);
    const files = await collectSourceFiles(targetPath);
    const state = createState();

    for (const file of files) {
      await scanFile({ file, maxFileBytes: request.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES, state });
    }

    return {
      dependencies: state.dependencies,
      findings: state.findings,
      scannedFiles: files.length - state.skippedFiles.length,
      skippedFiles: state.skippedFiles,
      targetPath
    };
  }
}

async function collectSourceFiles(targetPath: string): Promise<readonly SourceFile[]> {
  const metadata = await stat(targetPath);
  if (metadata.isFile()) return [toSourceFile(targetPath, targetPath, metadata.size)];
  if (metadata.isDirectory()) return walkDirectory(targetPath, targetPath);
  throw new Error(`Reverse analysis target is not a file or directory: ${targetPath}`);
}

async function walkDirectory(root: string, directory: string): Promise<readonly SourceFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => visitEntry({ directory, entry, root })));

  return nested.flat();
}

async function visitEntry(input: {
  readonly directory: string;
  readonly entry: { isDirectory(): boolean; isFile(): boolean; name: string };
  readonly root: string;
}): Promise<readonly SourceFile[]> {
  const absolutePath = join(input.directory, input.entry.name);
  if (input.entry.isDirectory()) return visitDirectory(input.root, absolutePath, input.entry.name);
  if (!input.entry.isFile() || !isScriptFile(input.entry.name)) return [];

  const metadata = await stat(absolutePath);
  return [toSourceFile(input.root, absolutePath, metadata.size)];
}

async function visitDirectory(root: string, absolutePath: string, name: string): Promise<readonly SourceFile[]> {
  if (SKIPPED_DIRECTORIES.has(name)) return [];
  return walkDirectory(root, absolutePath);
}

async function scanFile(input: {
  readonly file: SourceFile;
  readonly maxFileBytes: number;
  readonly state: ScanState;
}): Promise<void> {
  if (input.file.size > input.maxFileBytes) {
    input.state.skippedFiles.push({
      absolutePath: input.file.absolutePath,
      message: `File exceeds ${input.maxFileBytes} bytes`,
      path: input.file.path
    });
    return;
  }

  const source = await readFile(input.file.absolutePath, "utf8");
  source.split(/\r?\n/).forEach((line, index) => scanLine(input.file, line, index + 1, input.state));
}

function scanLine(file: SourceFile, line: string, lineNumber: number, state: ScanState): void {
  const dependencies = readDependencies(file, line, lineNumber);
  state.dependencies.push(...dependencies);

  for (const match of findLineMatches(line)) {
    state.findings.push(toFinding({ file, line, lineNumber, match }));
  }

  for (const dependency of dependencies) {
    state.findings.push(dependencyFinding(dependency, line));
  }
}

function findLineMatches(line: string): readonly LineMatch[] {
  return [
    matchPattern({ line, message: "Electron IPC channel usage", pattern: /\bipc(Main|Renderer)\.(handle|on|send|invoke)\s*\(/, severity: "warning", type: "electron-ipc" }),
    matchPattern({ line, message: "Network endpoint or client usage", pattern: /\b(fetch|XMLHttpRequest|WebSocket)\b|https?:\/\//, severity: "info", type: "network" }),
    matchPattern({ line, message: "Browser storage access", pattern: /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/, severity: "warning", type: "storage" }),
    matchPattern({ line, message: "Dynamic JavaScript execution", pattern: /\beval\s*\(|new\s+Function\s*\(/, severity: "critical", type: "dynamic-execution" }),
    matchPattern({ line, message: "Node child process execution", pattern: /\bchild_process\b|\b(exec|execFile|fork|spawn)\s*\(/, severity: "critical", type: "child-process" })
  ].filter((match): match is LineMatch => match !== null);
}

function readDependencies(file: SourceFile, line: string, lineNumber: number): readonly ReverseAnalysisDependency[] {
  return [
    ...readDependencyMatches({ absolutePath: file.absolutePath, importKind: "require", line, lineNumber, path: file.path, pattern: REQUIRE_PATTERN }),
    ...readDependencyMatches({ absolutePath: file.absolutePath, importKind: "import", line, lineNumber, path: file.path, pattern: IMPORT_PATTERN }),
    ...readDependencyMatches({ absolutePath: file.absolutePath, importKind: "dynamic-import", line, lineNumber, path: file.path, pattern: DYNAMIC_IMPORT_PATTERN })
  ];
}

function readDependencyMatches(input: DependencyMatchInput): readonly ReverseAnalysisDependency[] {
  input.pattern.lastIndex = 0;
  return [...input.line.matchAll(input.pattern)].map((match) => ({
    absolutePath: input.absolutePath,
    importKind: input.importKind,
    line: input.lineNumber,
    name: match[1] ?? "",
    path: input.path
  }));
}

function matchPattern(input: PatternMatchInput): LineMatch | null {
  return input.pattern.test(input.line)
    ? { message: input.message, severity: input.severity, type: input.type }
    : null;
}

function toFinding(input: {
  readonly file: SourceFile;
  readonly line: string;
  readonly lineNumber: number;
  readonly match: LineMatch;
}): ReverseAnalysisFinding {
  return {
    absolutePath: input.file.absolutePath,
    line: input.lineNumber,
    message: input.match.message,
    path: input.file.path,
    severity: input.match.severity,
    snippet: input.line.trim(),
    type: input.match.type
  };
}

function dependencyFinding(dependency: ReverseAnalysisDependency, line: string): ReverseAnalysisFinding {
  return {
    absolutePath: dependency.absolutePath,
    line: dependency.line,
    message: `Dependency imported: ${dependency.name}`,
    path: dependency.path,
    severity: "info",
    snippet: line.trim(),
    type: "dependency"
  };
}

function createState(): ScanState {
  return { dependencies: [], findings: [], skippedFiles: [] };
}

function isScriptFile(name: string): boolean {
  return SCRIPT_EXTENSIONS.has(extname(name).toLowerCase());
}

function toSourceFile(root: string, absolutePath: string, size: number): SourceFile {
  return { absolutePath, path: toRelativePath(root, absolutePath), size };
}

function toRelativePath(root: string, absolutePath: string): string {
  const path = relative(root, absolutePath).split(sep).join("/");
  return path === "" ? absolutePath : path;
}
