import React, { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, Settings2, Trash2, Wifi } from "lucide-react";
import type { ApiConfig, ApiProviderPreset, ApiTestResult } from "../../types/nexus";
import { activeBadgeStyle, activeButtonStyle, cardStyle, customBoxStyle, customTitleStyle, deleteButtonStyle, eyeButtonStyle, headerStyle, jsonErrorStyle, testResultStyle, textareaStyle, titleStyle } from "./apiConfigCardStyles";
import { inputStyle, labelStyle, primaryBtn, PROVIDER_ICONS } from "./settingsStyles";

export interface ApiConfigCardProps {
  readonly config: ApiConfig;
  readonly isActive: boolean;
  readonly isExpanded: boolean;
  readonly onExpand: () => void;
  readonly onRemove: () => void;
  readonly onSetActive: () => void;
  readonly onTest: () => void;
  readonly onToggleKey: () => void;
  readonly onUpdate: (updates: Partial<ApiConfig>) => void;
  readonly preset: ApiProviderPreset | undefined;
  readonly showKey: boolean;
  readonly testResult: ApiTestResult | undefined;
  readonly testing: boolean;
}

export function ApiConfigCard(props: ApiConfigCardProps) {
  return (
    <div style={cardStyle(props.config, props.isActive)}>
      <ConfigHeader {...props} />
      {props.isExpanded && <ExpandedFields {...props} />}
    </div>
  );
}

function ConfigHeader(props: ApiConfigCardProps) {
  return (
    <div style={headerStyle} onClick={props.onExpand}>
      <span style={{ fontSize: 16 }}>{PROVIDER_ICONS[props.config.provider]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle(props.config, props.isActive)}>{props.config.name}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{props.config.model}</div>
      </div>
      {props.isActive && <ActiveBadge provider={props.config.provider} />}
      {props.isExpanded ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}
    </div>
  );
}

function ExpandedFields(props: ApiConfigCardProps) {
  return (
    <div style={{ padding: "6px 12px 12px", borderTop: "1px solid var(--border-subtle)" }}>
      <SecretInput {...props} />
      <TextField label="Base URL" value={props.config.baseUrl} onChange={(baseUrl) => props.onUpdate({ baseUrl })} />
      <ModelField {...props} />
      <NumberFields {...props} />
      {props.config.provider === "custom" && <CustomProtocolFields {...props} />}
      <ActionRow {...props} />
      <TestResultView result={props.testResult} />
      <button onClick={props.onRemove} style={deleteButtonStyle}>
        <Trash2 size={11} /> 删除配置
      </button>
    </div>
  );
}

function SecretInput(props: ApiConfigCardProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>API Key</label>
      <div style={{ position: "relative" }}>
        <input
          type={props.showKey ? "text" : "password"}
          value={props.config.apiKey}
          onChange={(event) => props.onUpdate({ apiKey: event.target.value })}
          placeholder="sk-..."
          style={{ ...inputStyle, paddingRight: 30 }}
        />
        <button onClick={props.onToggleKey} style={eyeButtonStyle}>
          {props.showKey ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

function TextField(props: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>{props.label}</label>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function ModelField(props: ApiConfigCardProps) {
  if (props.preset !== undefined && props.preset.models.length > 0) {
    return (
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>模型</label>
        <select
          value={props.config.model}
          onChange={(event) => props.onUpdate({ model: event.target.value })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {props.preset.models.map((model) => <option key={model} value={model}>{model}</option>)}
        </select>
      </div>
    );
  }

  return <TextField label="模型" value={props.config.model} onChange={(model) => props.onUpdate({ model })} placeholder="输入模型名称" />;
}

function NumberFields(props: ApiConfigCardProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <NumberField label="Max Tokens" value={props.config.maxTokens} onChange={(maxTokens) => props.onUpdate({ maxTokens })} />
      <NumberField label="Temperature" max={2} min={0} step={0.1} value={props.config.temperature} onChange={(temperature) => props.onUpdate({ temperature })} />
    </div>
  );
}

function NumberField(props: {
  readonly label: string;
  readonly max?: number;
  readonly min?: number;
  readonly onChange: (value: number) => void;
  readonly step?: number;
  readonly value: number;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{props.label}</label>
      <input
        max={props.max}
        min={props.min}
        onChange={(event) => props.onChange(Number(event.target.value))}
        step={props.step}
        style={inputStyle}
        type="number"
        value={props.value}
      />
    </div>
  );
}

function CustomProtocolFields(props: ApiConfigCardProps) {
  return (
    <div style={customBoxStyle}>
      <div style={customTitleStyle}><Settings2 size={11} /> 自定义协议配置</div>
      <CustomMethodField {...props} />
      <CustomHeadersField {...props} />
      <TextareaField
        label="请求体模板 (支持 {{model}} {{prompt}})"
        value={props.config.customBodyTemplate ?? ""}
        onChange={(customBodyTemplate) => props.onUpdate({ customBodyTemplate })}
        placeholder='{"model": "{{model}}", "input": "{{prompt}}"}'
      />
      <TextField
        label="响应内容路径 (如 data.choices[0].message.content)"
        value={props.config.customResponsePath ?? ""}
        onChange={(customResponsePath) => props.onUpdate({ customResponsePath })}
        placeholder="data.choices[0].message.content"
      />
    </div>
  );
}

function CustomMethodField(props: ApiConfigCardProps) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={labelStyle}>HTTP 方法</label>
      <select
        value={props.config.customMethod ?? "POST"}
        onChange={(event) => props.onUpdate({ customMethod: event.target.value as "POST" | "GET" | "PUT" })}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        <option value="POST">POST</option>
        <option value="GET">GET</option>
        <option value="PUT">PUT</option>
      </select>
    </div>
  );
}

function CustomHeadersField(props: ApiConfigCardProps) {
  const [error, setError] = useState("");
  const [text, setText] = useState(formatHeaders(props.config.customHeaders));

  useEffect(() => {
    setText(formatHeaders(props.config.customHeaders));
  }, [props.config.id, props.config.customHeaders]);

  return (
    <div style={{ marginBottom: 6 }}>
      <TextareaField label="自定义请求头 (JSON)" value={text} onChange={(value) => updateHeaders(value, props.onUpdate, setText, setError)} />
      {error !== "" && <div style={jsonErrorStyle}>{error}</div>}
    </div>
  );
}

function TextareaField(props: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={labelStyle}>{props.label}</label>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        style={textareaStyle}
      />
    </div>
  );
}

function ActionRow(props: ApiConfigCardProps) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      <button onClick={props.onTest} disabled={props.testing} style={{ ...primaryBtn, opacity: props.testing ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4 }}>
        {props.testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
        {props.testing ? "测试中..." : "测试连接"}
      </button>
      <button onClick={props.onSetActive} style={activeButtonStyle(props.config, props.isActive)}>
        {props.isActive ? "✓ 当前活跃" : "设为活跃"}
      </button>
    </div>
  );
}

function TestResultView({ result }: { readonly result: ApiTestResult | undefined }) {
  if (result === undefined) {
    return null;
  }

  return (
    <div style={testResultStyle(result)}>
      {result.success ? <Check size={12} /> : <AlertCircle size={12} />}
      {result.message}
      {result.latency !== undefined && <span style={{ opacity: 0.7 }}>· {result.latency}ms</span>}
    </div>
  );
}

function ActiveBadge({ provider }: { readonly provider: ApiConfig["provider"] }) {
  return <div style={activeBadgeStyle(provider)}>活跃</div>;
}

function updateHeaders(
  value: string,
  onUpdate: (updates: Partial<ApiConfig>) => void,
  setText: (value: string) => void,
  setError: (value: string) => void
): void {
  setText(value);
  try {
    onUpdate({ customHeaders: JSON.parse(value) as Record<string, string> });
    setError("");
  } catch {
    setError("请求头 JSON 格式错误，修正后才会保存。");
  }
}

function formatHeaders(headers: Record<string, string> | undefined): string {
  return headers === undefined ? "{}" : JSON.stringify(headers, null, 2);
}
