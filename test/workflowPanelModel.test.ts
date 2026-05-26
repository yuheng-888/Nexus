import { describe, expect, it } from "vitest";
import {
  createWorkflowDraft,
  emptyWorkflowDraft,
  isWorkflowEditable,
  parseWorkflowDraft,
  sortWorkflowDefinitions,
  summarizeWorkflowSteps,
  workflowRunStatusLabel,
  workflowSourceLabel,
  type WorkflowDefinition
} from "../frontend/src/components/sidebar/workflowPanelModel.js";

describe("workflow panel model", () => {
  it("sorts builtin workflows before user workflows by name", () => {
    expect(sortWorkflowDefinitions(workflowDefinitions()).map((workflow) => workflow.id)).toEqual([
      "builtin-a",
      "builtin-b",
      "user-a"
    ]);
  });

  it("formats workflow source and run status labels", () => {
    expect(workflowSourceLabel("builtin")).toBe("内置");
    expect(workflowSourceLabel("user")).toBe("用户");
    expect(workflowRunStatusLabel("completed")).toBe("完成");
    expect(workflowRunStatusLabel("failed")).toBe("失败");
    expect(workflowRunStatusLabel("running")).toBe("运行中");
  });

  it("summarizes workflow step types", () => {
    const workflow = workflowDefinitions().find((item) => item.id === "builtin-a");

    expect(summarizeWorkflowSteps(workflow?.steps ?? [])).toBe("2 步 · Git 1 · RAG 1");
  });

  it("creates an editable empty workflow draft with a real first step", () => {
    const draft = emptyWorkflowDraft();
    const parsed = parseWorkflowDraft(draft);

    expect(parsed).toMatchObject({ name: "新的工作流" });
    expect(parsed.steps).toEqual([{ id: "todo", name: "任务", todos: [{ content: "描述要完成的事", status: "pending" }], type: "todo" }]);
  });

  it("edits user workflows by id and copies builtin workflows into user drafts", () => {
    const [user, builtin] = [workflowDefinitions()[0], workflowDefinitions()[1]];

    expect(isWorkflowEditable(user)).toBe(true);
    expect(isWorkflowEditable(builtin)).toBe(false);
    expect(parseWorkflowDraft(createWorkflowDraft(user))).toMatchObject({ id: "user-a", name: "User Macro" });
    expect(parseWorkflowDraft(createWorkflowDraft(builtin))).toMatchObject({ id: undefined, name: "Beta 副本" });
  });

  it("parses workflow step JSON and reports invalid drafts explicitly", () => {
    expect(parseWorkflowDraft({ description: "  desc  ", id: "wf", name: "  Build  ", stepsJson: "[]" })).toEqual({
      description: "desc",
      id: "wf",
      name: "Build",
      steps: []
    });

    expect(() => parseWorkflowDraft({ description: "", name: "", stepsJson: "[]" })).toThrow(/工作流名称不能为空/);
    expect(() => parseWorkflowDraft({ description: "", name: "Bad", stepsJson: "{}" })).toThrow(/步骤 JSON 必须是数组/);
    expect(() => parseWorkflowDraft({ description: "", name: "Bad", stepsJson: "{" })).toThrow(/步骤 JSON 解析失败/);
  });
});

function workflowDefinitions(): readonly WorkflowDefinition[] {
  return [
    {
      createdAt: 2,
      id: "user-a",
      name: "User Macro",
      source: "user",
      steps: [{ id: "todo", name: "Todo", todos: [], type: "todo" }],
      updatedAt: 2
    },
    {
      createdAt: 0,
      id: "builtin-b",
      name: "Beta",
      source: "builtin",
      steps: [{ id: "command", name: "Command", command: "npm test", type: "command" }],
      updatedAt: 0
    },
    {
      createdAt: 0,
      id: "builtin-a",
      name: "Alpha",
      source: "builtin",
      steps: [
        { id: "git", name: "Git", operation: "status", type: "git" },
        { id: "rag", name: "RAG", operation: "status", type: "rag" }
      ],
      updatedAt: 0
    }
  ];
}
