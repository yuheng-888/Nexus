import React, { useCallback, useEffect, useRef, useState } from "react";
import { Cpu, Loader2, Plus } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { ApiConfig, ApiProviderPreset, ApiTestResult } from "../../types/nexus";
import { ApiConfigCard } from "./ApiConfigCard";
import { ApiConfigDraftSaver, applyConfigDraft } from "./settingsDrafts";
import { ghostBtn, inputStyle, PROVIDER_COLORS, PROVIDER_ICONS } from "./settingsStyles";
import { aboutStyle, addButtonStyle, addPanelStyle, brandStyle, compactSettingStyle, generalBoxStyle, headerWrapStyle, messageStyle, providerButtonStyle, sectionTitleStyle, switchKnobStyle, switchStyle } from "./settingsViewStyles";
import { ThemeSelector } from "./ThemeSelector";

const SAVE_DEBOUNCE_MS = 300;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export function SettingsView() {
  const activeApiConfig = useStore((state) => state.activeApiConfig);
  const setApiConfigs = useStore((state) => state.setApiConfigs);
  const setActiveApiConfig = useStore((state) => state.setActiveApiConfig);
  const [draftConfigs, setDraftConfigs] = useState<ApiConfig[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [presets, setPresets] = useState<ApiProviderPreset[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showKey, setShowKey] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, ApiTestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const saverRef = useRef<ApiConfigDraftSaver | null>(null);

  useEffect(() => {
    const saver = new ApiConfigDraftSaver({
      delayMs: SAVE_DEBOUNCE_MS,
      onError: (error) => setMessage(`保存失败: ${error.message}`),
      update: window.nexus.api.update
    });
    saverRef.current = saver;

    return () => {
      void saver.flushAll().catch((error: unknown) => console.error("Failed to flush API config drafts:", error));
      saver.dispose();
      saverRef.current = null;
    };
  }, []);

  const loadFromBackend = useCallback(async () => {
    setLoading(true);
    try {
      const [presetData, configData] = await Promise.all([
        window.nexus.api.presets(),
        window.nexus.api.configs()
      ]);
      setPresets(presetData);
      setDraftConfigs(configData.configs);
      setApiConfigs(configData.configs, configData.activeId);
      setExpandedId(configData.activeId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [setApiConfigs]);

  useEffect(() => {
    void loadFromBackend();
  }, [loadFromBackend]);

  const updateConfig = useCallback((id: string, updates: Partial<ApiConfig>) => {
    setMessage("");
    setDraftConfigs((current) => applyConfigDraft(current, id, updates));
    setApiConfigs(applyConfigDraft(useStore.getState().apiConfigs, id, updates));
    saverRef.current?.schedule(id, updates);
  }, [setApiConfigs]);

  const toggleKey = useCallback((id: string) => {
    setShowKey((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSetActive = useCallback(async (id: string) => {
    try {
      await saverRef.current?.flush(id);
      await window.nexus.api.setActive(id);
      setActiveApiConfig(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [setActiveApiConfig]);

  const handleTest = useCallback(async (id: string) => {
    setTesting(id);
    try {
      await saverRef.current?.flush(id);
      const result = await window.nexus.api.test(id);
      setTestResults((current) => ({ ...current, [id]: result }));
    } catch (error) {
      setTestResults((current) => ({ ...current, [id]: { success: false, message: String(error) } }));
    } finally {
      setTesting(null);
    }
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    try {
      saverRef.current?.discard(id);
      await window.nexus.api.remove(id);
      await loadFromBackend();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [loadFromBackend]);

  const handleAddFromPreset = useCallback(async (preset: ApiProviderPreset) => {
    try {
      const created = await window.nexus.api.add(createConfigFromPreset(preset));
      await loadFromBackend();
      setExpandedId(created.id);
      setShowAdd(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [loadFromBackend]);

  return (
    <div style={{ padding: "0 4px", animation: "fadeIn 0.3s var(--ease-out)" }}>
      <SettingsHeader activeName={findActiveName(draftConfigs, activeApiConfig)} onAdd={() => setShowAdd(!showAdd)} />
      {showAdd && <AddProviderPanel onAdd={handleAddFromPreset} onCancel={() => setShowAdd(false)} presets={presets} />}
      {message !== "" && <MessageBox message={message} />}
      {loading ? <LoadingState /> : draftConfigs.map((config) => (
        <ApiConfigCard
          config={config}
          isActive={activeApiConfig === config.id}
          isExpanded={expandedId === config.id}
          key={config.id}
          onExpand={() => {
            setExpandedId(expandedId === config.id ? null : config.id);
            void handleSetActive(config.id);
          }}
          onRemove={() => void handleRemove(config.id)}
          onSetActive={() => void handleSetActive(config.id)}
          onTest={() => void handleTest(config.id)}
          onToggleKey={() => toggleKey(config.id)}
          onUpdate={(updates) => updateConfig(config.id, updates)}
          preset={presets.find((preset) => preset.provider === config.provider)}
          showKey={showKey.has(config.id)}
          testResult={testResults[config.id]}
          testing={testing === config.id}
        />
      ))}
      <GeneralSettings />
      <AboutBox />
    </div>
  );
}

function SettingsHeader(props: { readonly activeName: string; readonly onAdd: () => void }) {
  return (
    <div style={headerWrapStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>当前活跃配置</div>
        <div style={{ fontSize: 12, color: "var(--text-accent)", fontWeight: 600 }}>{props.activeName}</div>
      </div>
      <button onClick={props.onAdd} style={addButtonStyle}><Plus size={11} /> 添加</button>
    </div>
  );
}

function AddProviderPanel(props: {
  readonly onAdd: (preset: ApiProviderPreset) => void;
  readonly onCancel: () => void;
  readonly presets: readonly ApiProviderPreset[];
}) {
  return (
    <div style={addPanelStyle}>
      <div style={{ fontSize: 11, color: "var(--text-accent)", fontWeight: 600, marginBottom: 8 }}>选择 API 协议</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {props.presets.map((preset) => <ProviderButton key={preset.provider} onAdd={props.onAdd} preset={preset} />)}
      </div>
      <button onClick={props.onCancel} style={ghostBtn}>取消</button>
    </div>
  );
}

function ProviderButton(props: {
  readonly onAdd: (preset: ApiProviderPreset) => void;
  readonly preset: ApiProviderPreset;
}) {
  return (
    <button
      onClick={() => props.onAdd(props.preset)}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = PROVIDER_COLORS[props.preset.provider];
        event.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--border-subtle)";
        event.currentTarget.style.background = "transparent";
      }}
      style={providerButtonStyle}
    >
      <span style={{ fontSize: 18 }}>{PROVIDER_ICONS[props.preset.provider]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 1 }}>{props.preset.name}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{props.preset.description}</div>
      </div>
      <div style={providerDotStyle(props.preset)} />
    </button>
  );
}

function MessageBox({ message }: { readonly message: string }) {
  return <div style={messageStyle}>{message}</div>;
}

function LoadingState() {
  return (
    <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
      <Loader2 size={18} className="animate-spin" style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 12 }}>加载配置...</div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div style={{ padding: "12px 12px 4px" }}>
      <div style={sectionTitleStyle}><Cpu size={13} color="var(--text-accent)" />通用设置</div>
      <div style={generalBoxStyle}>
        <ThemeSelector />
        <CompactSetting label="编辑器字体大小" value="13" />
        <CompactSetting label="Tab 大小" value="2" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-primary)" }}>自动保存</span>
          <div style={switchStyle}><div style={switchKnobStyle} /></div>
        </div>
      </div>
    </div>
  );
}

function CompactSetting(props: { readonly label: string; readonly value: string }) {
  return (
    <div style={compactSettingStyle}>
      <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{props.label}</span>
      <input defaultValue={props.value} style={{ ...inputStyle, width: 60, textAlign: "center" }} />
    </div>
  );
}

function AboutBox() {
  return (
    <div style={{ padding: "8px 12px" }}>
      <div style={aboutStyle}>
        <div style={brandStyle}>Nexus IDE</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>v0.1.0 · 智能开发环境</div>
      </div>
    </div>
  );
}

function createConfigFromPreset(preset: ApiProviderPreset): Omit<ApiConfig, "id"> {
  return {
    apiKey: "",
    baseUrl: preset.baseUrl,
    enabled: true,
    maxTokens: DEFAULT_MAX_TOKENS,
    model: preset.defaultModel,
    name: preset.name,
    provider: preset.provider,
    temperature: DEFAULT_TEMPERATURE
  };
}

function findActiveName(configs: readonly ApiConfig[], activeId: string | null): string {
  return configs.find((config) => config.id === activeId)?.name ?? "未设置";
}

function providerDotStyle(preset: ApiProviderPreset): React.CSSProperties {
  return {
    background: PROVIDER_COLORS[preset.provider],
    borderRadius: "50%",
    boxShadow: `0 0 6px ${PROVIDER_COLORS[preset.provider]}`,
    height: 6,
    width: 6
  };
}
