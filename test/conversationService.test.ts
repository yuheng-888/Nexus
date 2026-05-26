import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { ConversationService } from "../src/main/conversationService.js";

let storeDir = "";

afterEach(async () => {
  if (storeDir !== "") {
    await rm(storeDir, { force: true, recursive: true });
    storeDir = "";
  }
});

describe("ConversationService", () => {
  it("persists conversation messages across service instances", async () => {
    const storePath = await createStorePath();
    const service = new ConversationService({ storePath });

    await service.appendMessage("main", { content: "hello Nexus", role: "user" });
    await service.appendMessage("main", { content: "hello human", role: "assistant" });

    const reloaded = new ConversationService({ storePath });
    const conversation = await reloaded.getConversation("main");

    expect(conversation.messages.map((message) => message.content)).toEqual([
      "hello Nexus",
      "hello human"
    ]);
    expect(conversation.title).toBe("hello Nexus");
  });

  it("builds model context from persisted history and the next prompt", async () => {
    const service = new ConversationService({ storePath: await createStorePath() });
    await service.appendMessage("main", { content: "remember the project is Nexus", role: "user" });
    await service.appendMessage("main", { content: "I will remember Nexus", role: "assistant" });

    const result = await service.prepareModelMessages({
      contextTokenLimit: 400,
      conversationId: "main",
      prompt: "what project are we building?",
      systemPrompt: "system context"
    });

    expect(result.messages.map((message) => message.content)).toEqual([
      "system context",
      "remember the project is Nexus",
      "I will remember Nexus",
      "what project are we building?"
    ]);
    expect(result.compacted).toBe(false);
  });

  it("compacts old context when the token budget is exceeded", async () => {
    const storePath = await createStorePath();
    const service = new ConversationService({ storePath });
    for (let index = 0; index < 12; index += 1) {
      await service.appendMessage("main", {
        content: `old message ${index} ${"details ".repeat(12)}`,
        role: index % 2 === 0 ? "user" : "assistant"
      });
    }

    const result = await service.prepareModelMessages({
      contextTokenLimit: 90,
      conversationId: "main",
      prompt: "current request must remain",
      systemPrompt: "system context"
    });
    const persisted = JSON.parse(await readFile(storePath, "utf8"));

    expect(result.compacted).toBe(true);
    expect(result.messages[1]?.content).toContain("Compressed conversation summary");
    expect(result.messages.at(-1)).toMatchObject({
      content: "current request must remain",
      role: "user"
    });
    expect(persisted.conversations[0].summary).toContain("old message 0");
    expect(persisted.conversations[0].messages.length).toBeLessThan(13);
  });
});

async function createStorePath(): Promise<string> {
  storeDir = await mkdtemp(join(tmpdir(), "nexus-conversations-"));
  return join(storeDir, "conversations.json");
}
