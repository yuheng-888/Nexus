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
});
