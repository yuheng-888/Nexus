import type React from "react";
import { FileSearch, FolderOpen, Save } from "lucide-react";
import { iconButtonStyle, inputStyle } from "./reversePanelStyles";

export type ReversePathPickIcon = "directory" | "file" | "save";

export interface ReversePathPickButton {
  readonly icon: ReversePathPickIcon;
  readonly onPick: () => Promise<void>;
  readonly title: string;
}

interface ReversePathInputProps {
  readonly buttons: readonly ReversePathPickButton[];
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
}

export function ReversePathInput(props: ReversePathInputProps) {
  return (
    <div style={wrapStyle}>
      <input
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        style={inputStyle}
        value={props.value}
      />
      <div style={buttonGroupStyle}>
        {props.buttons.map((button) => (
          <button
            disabled={props.disabled}
            key={button.title}
            onClick={() => void button.onPick()}
            style={buttonState(iconButtonStyle, props.disabled)}
            title={button.title}
          >
            {pickIcon(button.icon)}
          </button>
        ))}
      </div>
    </div>
  );
}

function pickIcon(icon: ReversePathPickIcon): React.ReactNode {
  if (icon === "directory") return <FolderOpen size={12} />;
  if (icon === "save") return <Save size={12} />;
  return <FileSearch size={12} />;
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  if (!disabled) return style;
  return { ...style, cursor: "not-allowed", opacity: 0.55 };
}

const wrapStyle: React.CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: 6,
  gridTemplateColumns: "minmax(0, 1fr) auto"
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 4
};
