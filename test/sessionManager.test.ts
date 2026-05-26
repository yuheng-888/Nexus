import { describe, expect, it } from "vitest";
import { SessionManager, type PtyFactory, type PtyProcess } from "../src/main/sessionManager.js";

class FakePty implements PtyProcess {
  readonly writes: string[] = [];
  private dataHandler: (data: string) => void = () => {};
  private exitHandler: (exit: { exitCode: number; signal?: number }) => void = () => {};

  kill(): void {
    this.exitHandler({ exitCode: 0 });
  }

  onData(handler: (data: string) => void): void {
    this.dataHandler = handler;
  }

  onExit(handler: (exit: { exitCode: number; signal?: number }) => void): void {
    this.exitHandler = handler;
  }

  resize(): void {}

  write(data: string): void {
    this.writes.push(data);
  }

  emitData(data: string): void {
    this.dataHandler(data);
  }
}

describe("SessionManager", () => {
  it("creates sessions and forwards pty data", () => {
    const fake = new FakePty();
    const events: string[] = [];
    const factory: PtyFactory = {
      spawn: () => fake
    };
    const manager = new SessionManager({
      onData: (_id, data) => events.push(data),
      onExit: () => {},
      ptyFactory: factory
    });

    const session = manager.create({
      args: ["-l"],
      command: "zsh",
      cwd: "/workspace",
      kind: "terminal"
    });
    fake.emitData("hello");
    manager.write(session.id, "pwd\n");

    expect(events).toEqual(["hello"]);
    expect(fake.writes).toEqual(["pwd\n"]);
  });

  it("throws explicit errors for unknown sessions", () => {
    const manager = new SessionManager({
      onData: () => {},
      onExit: () => {},
      ptyFactory: { spawn: () => new FakePty() }
    });

    expect(() => manager.write("missing", "pwd\n")).toThrow(/Unknown session/);
  });

  it("delivers writes to native runtime sessions through the input channel", async () => {
    const inputs: string[] = [];
    const exits: number[] = [];
    const manager = new SessionManager({
      onData: () => {},
      onExit: (_sessionId, exit) => exits.push(exit.exitCode),
      ptyFactory: { spawn: () => new FakePty() }
    });

    const session = manager.createRuntime({
      args: [],
      command: "nexus-agent-runtime",
      cwd: "/workspace",
      kind: "agent"
    }, async (controller) => {
      await new Promise<void>((resolve) => {
        controller.onInput((data) => {
          inputs.push(data);
          resolve();
        });
      });
    });

    manager.write(session.id, "{\"approved\":true}\n");

    await waitForExit(exits);
    expect(inputs).toEqual(["{\"approved\":true}\n"]);
    expect(exits).toEqual([0]);
  });
});

async function waitForExit(exits: readonly number[]): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (exits.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("runtime session did not exit");
}
