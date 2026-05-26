import type { WorkflowDefinition } from "../workflowContracts.js";

const CREATED_AT = 0;

export function getBuiltinWorkflowDefinitions(): readonly WorkflowDefinition[] {
  return [
    {
      createdAt: CREATED_AT,
      description: "Build the local code index used by Nexus RAG.",
      id: "nexus.rag.build-index",
      name: "Build Code Index",
      source: "builtin",
      steps: [
        { id: "build-index", name: "Build RAG index", operation: "buildIndex", type: "rag" },
        { id: "index-status", name: "Read index status", operation: "status", type: "rag" }
      ],
      updatedAt: CREATED_AT
    },
    {
      createdAt: CREATED_AT,
      description: "Capture Git branch status and current diff.",
      id: "nexus.git.snapshot",
      name: "Git Snapshot",
      source: "builtin",
      steps: [
        { id: "git-status", name: "Git status", operation: "status", type: "git" },
        { id: "git-diff", name: "Git diff", operation: "diff", type: "git" }
      ],
      updatedAt: CREATED_AT
    },
    {
      createdAt: CREATED_AT,
      description: "Ask a native Nexus reviewer subagent to inspect the current work.",
      id: "nexus.ai.review",
      name: "AI Review",
      source: "builtin",
      steps: [
        {
          id: "review",
          name: "Run reviewer",
          profileId: "reviewer",
          prompt: "Review the current workspace changes. Focus on bugs, regressions, and missing tests.\n\n{{prompt}}",
          type: "subagent"
        }
      ],
      updatedAt: CREATED_AT
    }
  ];
}
