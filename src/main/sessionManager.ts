import { randomUUID } from "node:crypto";
import type { SessionKind, SessionSnapshot } from "../contracts.js";

export interface PtyProcess {
  kill(): void;
  onData(handler: (data: string) => void): void;
  onExit(handler: (exit: PtyExit) => void): void;
  resize(cols: number, rows: number): void;
  write(data: string): void;
}

export interface PtyExit {
  readonly exitCode: number;
  readonly signal?: number;
}

export interface PtySpawnOptions {
  readonly cols?: number;
  readonly cwd: string;
  readonly rows?: number;
}

export interface PtyFactory {
  spawn(command: string, args: readonly string[], options: PtySpawnOptions): PtyProcess;
}

export interface SessionCreateOptions {
  readonly args: readonly string[];
  readonly cols?: number;
  readonly command: string;
  readonly cwd: string;
  readonly kind: SessionKind;
  readonly rows?: number;
}

export interface RuntimeSessionController {
  readonly signal: AbortSignal;
  emitData(data: string): void;
  exit(exitCode: number): void;
}

export type RuntimeSessionRunner = (controller: RuntimeSessionController) => Promise<void>;

export interface SessionManagerOptions {
  readonly onData: (sessionId: string, data: string) => void;
  readonly onExit: (sessionId: string, exit: PtyExit) => void;
  readonly ptyFactory: PtyFactory;
}

interface ManagedSession extends SessionSnapshot {
  readonly pty: PtyProcess;
}

const ABORT_EXIT_CODE = 130;

export class SessionManager {
  private readonly options: SessionManagerOptions;
  private readonly sessions = new Map<string, ManagedSession>();

  constructor(options: SessionManagerOptions) {
    this.options = options;
  }

  create(options: SessionCreateOptions): SessionSnapshot {
    const id = randomUUID();
    const pty = this.options.ptyFactory.spawn(options.command, options.args, options);
    const session = { ...options, id, pty };

    pty.onData((data) => this.options.onData(id, data));
    pty.onExit((exit) => this.handleExit(id, exit));
    this.sessions.set(id, session);

    return toSnapshot(session);
  }

  createRuntime(options: SessionCreateOptions, runner: RuntimeSessionRunner): SessionSnapshot {
    const id = randomUUID();
    const pty = new RuntimeSessionProcess(runner);
    const session = { ...options, id, pty };

    pty.onData((data) => this.options.onData(id, data));
    pty.onExit((exit) => this.handleExit(id, exit));
    this.sessions.set(id, session);
    pty.start();

    return toSnapshot(session);
  }

  kill(sessionId: string): void {
    this.getSession(sessionId).pty.kill();
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.getSession(sessionId).pty.resize(cols, rows);
  }

  write(sessionId: string, data: string): void {
    this.getSession(sessionId).pty.write(data);
  }

  private getSession(sessionId: string): ManagedSession {
    const session = this.sessions.get(sessionId);

    if (session === undefined) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    return session;
  }

  private handleExit(sessionId: string, exit: PtyExit): void {
    this.sessions.delete(sessionId);
    this.options.onExit(sessionId, exit);
  }
}

function toSnapshot(session: ManagedSession): SessionSnapshot {
  return {
    args: session.args,
    command: session.command,
    cwd: session.cwd,
    id: session.id,
    kind: session.kind
  };
}

class RuntimeSessionProcess implements PtyProcess, RuntimeSessionController {
  private readonly abortController = new AbortController();
  private readonly runner: RuntimeSessionRunner;
  private dataHandler: (data: string) => void = () => {};
  private exited = false;
  private exitHandler: (exit: PtyExit) => void = () => {};

  constructor(runner: RuntimeSessionRunner) {
    this.runner = runner;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  start(): void {
    void this.run();
  }

  emitData(data: string): void {
    if (!this.exited) {
      this.dataHandler(data);
    }
  }

  exit(exitCode: number): void {
    if (this.exited) {
      return;
    }

    this.exited = true;
    this.exitHandler({ exitCode });
  }

  kill(): void {
    this.abortController.abort();
    this.exit(ABORT_EXIT_CODE);
  }

  onData(handler: (data: string) => void): void {
    this.dataHandler = handler;
  }

  onExit(handler: (exit: PtyExit) => void): void {
    this.exitHandler = handler;
  }

  resize(): void {
    throw new Error("Native runtime sessions do not support terminal resize");
  }

  write(): void {
    throw new Error("Native runtime sessions do not accept stdin");
  }

  private async run(): Promise<void> {
    try {
      await this.runner(this);
      this.exit(0);
    } catch (error) {
      this.emitData(toRuntimeErrorEvent(error));
      this.exit(1);
    }
  }
}

function toRuntimeErrorEvent(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `${JSON.stringify({ message, type: "agent.error" })}\n`;
}
