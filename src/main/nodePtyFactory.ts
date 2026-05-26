import * as pty from "node-pty";
import type { PtyFactory, PtyProcess, PtySpawnOptions } from "./sessionManager.js";

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 32;

export class NodePtyFactory implements PtyFactory {
  spawn(command: string, args: readonly string[], options: PtySpawnOptions): PtyProcess {
    const process = pty.spawn(command, [...args], {
      cols: options.cols ?? DEFAULT_COLS,
      cwd: options.cwd,
      env: processEnv(),
      name: "xterm-256color",
      rows: options.rows ?? DEFAULT_ROWS
    });

    return process;
  }
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}
