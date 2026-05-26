import { access, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { Stats } from "node:fs";
import type { ReverseTargetDetection, ReverseTargetType } from "../reverseContracts.js";

interface DetectionResult {
  readonly confidence: number;
  readonly signals: readonly string[];
  readonly type: ReverseTargetType;
}

const SCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

export class ReverseTargetService {
  async detect(targetPath: string): Promise<ReverseTargetDetection> {
    const absolutePath = resolve(targetPath);
    const metadata = await stat(absolutePath);
    const detected = await detectPath({ absolutePath, metadata });

    return {
      absolutePath,
      confidence: detected.confidence,
      name: basename(absolutePath),
      path: targetPath,
      signals: detected.signals,
      type: detected.type
    };
  }
}

async function detectPath(input: {
  readonly absolutePath: string;
  readonly metadata: Stats;
}): Promise<DetectionResult> {
  if (input.metadata.isFile()) return detectFile(input.absolutePath);
  if (input.metadata.isDirectory()) return detectDirectory(input.absolutePath);
  return unknown(["target is neither a regular file nor a directory"]);
}

function detectFile(absolutePath: string): DetectionResult {
  const extension = extname(absolutePath).toLowerCase();
  if (extension === ".asar") return result("asar", 1, ["file extension is .asar"]);
  if (SCRIPT_EXTENSIONS.has(extension)) {
    return result("javascript-bundle", 0.72, [`file extension is ${extension}`]);
  }

  return unknown([`file extension ${extension || "(none)"} is not recognized`]);
}

async function detectDirectory(absolutePath: string): Promise<DetectionResult> {
  if (await exists(join(absolutePath, "Contents", "Resources", "app.asar"))) {
    return result("electron-app", 0.96, ["macOS Electron app resources contain app.asar"]);
  }

  if (await exists(join(absolutePath, "resources", "app.asar"))) {
    return result("electron-app", 0.9, ["Electron resources directory contains app.asar"]);
  }

  if (await exists(join(absolutePath, "package.json"))) {
    return result("node-project", 0.82, ["directory contains package.json"]);
  }

  return unknown(["directory has no Electron or Node project markers"]);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function result(type: ReverseTargetType, confidence: number, signals: readonly string[]): DetectionResult {
  return { confidence, signals, type };
}

function unknown(signals: readonly string[]): DetectionResult {
  return result("unknown", 0, signals);
}
