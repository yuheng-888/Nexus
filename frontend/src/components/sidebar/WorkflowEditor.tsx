import type React from "react";
import { Save, X } from "lucide-react";
import type { WorkflowEditorDraft } from "./workflowPanelModel";
import {
  actionRowStyle,
  cardStyle,
  codeTextareaStyle,
  editorGridStyle,
  inputStyle,
  metaStyle,
  runButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  textareaStyle
} from "./workflowPanelStyles";

interface WorkflowEditorProps {
  readonly draft: WorkflowEditorDraft;
  readonly onCancel: () => void;
  readonly onChange: (draft: WorkflowEditorDraft) => void;
  readonly onSave: () => Promise<void>;
  readonly saving: boolean;
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <>
      <div style={sectionTitleStyle}>编辑</div>
      <section style={cardStyle}>
        <div style={editorGridStyle}>
          <input
            onChange={(event) => props.onChange({ ...props.draft, name: event.target.value })}
            placeholder="工作流名称"
            style={inputStyle}
            value={props.draft.name}
          />
          <textarea
            onChange={(event) => props.onChange({ ...props.draft, description: event.target.value })}
            placeholder="描述"
            style={textareaStyle}
            value={props.draft.description}
          />
          <div style={metaStyle}>步骤 JSON</div>
          <textarea
            onChange={(event) => props.onChange({ ...props.draft, stepsJson: event.target.value })}
            spellCheck={false}
            style={codeTextareaStyle}
            value={props.draft.stepsJson}
          />
          <EditorActions onCancel={props.onCancel} onSave={props.onSave} saving={props.saving} />
        </div>
      </section>
    </>
  );
}

function EditorActions(props: {
  readonly onCancel: () => void;
  readonly onSave: () => Promise<void>;
  readonly saving: boolean;
}) {
  return (
    <div style={actionRowStyle}>
      <button disabled={props.saving} onClick={() => void props.onSave()} style={buttonStyle(runButtonStyle, props.saving)}>
        <Save size={12} />
        {props.saving ? "保存中" : "保存"}
      </button>
      <button disabled={props.saving} onClick={props.onCancel} style={buttonStyle(secondaryButtonStyle, props.saving)}>
        <X size={12} />
        取消
      </button>
    </div>
  );
}

function buttonStyle(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;

  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}
