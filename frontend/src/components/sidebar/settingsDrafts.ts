import type { ApiConfig } from "../../types/nexus";

export type ApiConfigUpdate = Partial<ApiConfig>;
export type ApiConfigUpdateFn = (id: string, updates: ApiConfigUpdate) => Promise<ApiConfig | null>;

export interface ApiConfigDraftSaverOptions {
  readonly delayMs: number;
  readonly onError: (error: Error) => void;
  readonly update: ApiConfigUpdateFn;
}

export function applyConfigDraft(
  configs: readonly ApiConfig[],
  id: string,
  updates: ApiConfigUpdate
): ApiConfig[] {
  let found = false;
  const next = configs.map((config) => {
    if (config.id !== id) {
      return config;
    }

    found = true;
    return { ...config, ...updates };
  });

  if (!found) {
    throw new Error(`未知模型配置: ${id}`);
  }

  return next;
}

export class ApiConfigDraftSaver {
  private readonly delayMs: number;
  private readonly onError: (error: Error) => void;
  private readonly pending = new Map<string, ApiConfigUpdate>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly update: ApiConfigUpdateFn;

  constructor(options: ApiConfigDraftSaverOptions) {
    this.delayMs = options.delayMs;
    this.onError = options.onError;
    this.update = options.update;
  }

  schedule(id: string, updates: ApiConfigUpdate): void {
    this.pending.set(id, { ...this.pending.get(id), ...updates });
    this.clearTimer(id);
    this.timers.set(id, setTimeout(() => {
      void this.flush(id).catch((error: unknown) => this.onError(toError(error)));
    }, this.delayMs));
  }

  async flush(id: string): Promise<void> {
    this.clearTimer(id);
    const updates = this.pending.get(id);

    if (updates === undefined) {
      return;
    }

    this.pending.delete(id);
    const saved = await this.update(id, updates);

    if (saved === null) {
      throw new Error(`模型配置 ${id} 保存失败`);
    }
  }

  async flushAll(): Promise<void> {
    const ids = [...this.pending.keys()];

    await Promise.all(ids.map((id) => this.flush(id)));
  }

  discard(id: string): void {
    this.clearTimer(id);
    this.pending.delete(id);
  }

  dispose(): void {
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
