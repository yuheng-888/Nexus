import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkflowDefinition, WorkflowRun } from "../../types/workflow";
import {
  createWorkflowDraft,
  emptyWorkflowDraft,
  parseWorkflowDraft,
  sortWorkflowDefinitions,
  workflowErrorMessage,
  type WorkflowEditorDraft
} from "./workflowPanelModel";

export function useWorkflowPanelState() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<WorkflowEditorDraft | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runs, setRuns] = useState<readonly WorkflowRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<readonly WorkflowDefinition[]>([]);
  const sortedWorkflows = useMemo(() => sortWorkflowDefinitions(workflows), [workflows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadWorkflowPanelData();
      setWorkflows(data.workflows);
      setRuns(data.runs);
      setSelectedId((current) => nextSelectedWorkflowId(current, data.workflows));
    } catch (caught) {
      setError(workflowErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const runWorkflow = useCallback(async (workflowId: string) => {
    setError("");
    setRunningId(workflowId);
    try {
      const run = await window.nexus.workflows.run({ workflowId });
      setRuns((current) => [run, ...current]);
    } catch (caught) {
      setError(workflowErrorMessage(caught));
    } finally {
      setRunningId(null);
    }
  }, []);

  const createWorkflow = useCallback(() => {
    setError("");
    setEditorDraft(emptyWorkflowDraft());
  }, []);

  const editWorkflow = useCallback((workflow: WorkflowDefinition) => {
    setError("");
    setSelectedId(workflow.id);
    setEditorDraft(createWorkflowDraft(workflow));
  }, []);

  const saveWorkflow = useCallback(async () => {
    if (editorDraft === null) return;
    setSaving(true);
    setError("");
    try {
      const saved = await window.nexus.workflows.save(parseWorkflowDraft(editorDraft));
      setEditorDraft(null);
      await load();
      setSelectedId(saved.id);
    } catch (caught) {
      setError(workflowErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }, [editorDraft, load]);

  const deleteWorkflow = useCallback(async (workflowId: string) => {
    setDeletingId(workflowId);
    setError("");
    try {
      if (!await window.nexus.workflows.delete(workflowId)) {
        throw new Error(`工作流不存在或不可删除: ${workflowId}`);
      }
      setEditorDraft((draft) => draft?.id === workflowId ? null : draft);
      await load();
    } catch (caught) {
      setError(workflowErrorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    createWorkflow,
    deleteWorkflow,
    deletingId,
    editWorkflow,
    editorDraft,
    error,
    load,
    loading,
    runWorkflow,
    runningId,
    runs,
    saveWorkflow,
    saving,
    selectedId,
    setEditorDraft,
    setSelectedId,
    sortedWorkflows,
    workflowCount: workflows.length
  };
}

function nextSelectedWorkflowId(
  current: string | null,
  workflows: readonly WorkflowDefinition[]
): string | null {
  if (current !== null && workflows.some((workflow) => workflow.id === current)) return current;
  return workflows[0]?.id ?? null;
}

async function loadWorkflowPanelData(): Promise<{
  readonly runs: readonly WorkflowRun[];
  readonly workflows: readonly WorkflowDefinition[];
}> {
  const [definitions, runs] = await Promise.all([
    window.nexus.workflows.list(),
    window.nexus.workflows.runs()
  ]);

  return { runs, workflows: sortWorkflowDefinitions(definitions) };
}
