import { describe, expect, it } from "vitest";
import { chatMessageLayout } from "../frontend/src/components/ai/chatMessageLayout";

describe("chatMessageLayout", () => {
  it("places user messages on the right and assistant messages on the left", () => {
    expect(chatMessageLayout("user")).toMatchObject({
      alignItems: "flex-end",
      flexDirection: "row-reverse",
      textAlign: "right"
    });

    expect(chatMessageLayout("assistant")).toMatchObject({
      alignItems: "flex-start",
      flexDirection: "row",
      textAlign: "left"
    });
  });
});
