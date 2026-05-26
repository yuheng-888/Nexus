import { isAbsolute, resolve } from "node:path";
import type { ShellRevealResult } from "../shellContracts.js";

export interface ShellBridge {
  showItemInFolder(path: string): void;
}

export interface ShellServiceOptions {
  readonly bridge: ShellBridge;
}

export class ShellService {
  private readonly bridge: ShellBridge;

  constructor(options: ShellServiceOptions) {
    this.bridge = options.bridge;
  }

  revealPath(path: string): ShellRevealResult {
    const absolutePath = requireAbsolutePath(path);
    this.bridge.showItemInFolder(absolutePath);
    return { path: absolutePath, success: true };
  }
}

function requireAbsolutePath(path: string): string {
  if (!isAbsolute(path)) {
    throw new Error(`Shell reveal requires an absolute path: ${path}`);
  }

  return resolve(path);
}
