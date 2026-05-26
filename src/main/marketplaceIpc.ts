import { ipcMain } from "electron";
import type { PluginSearchRequest, SkillsSearchRequest } from "../contracts.js";
import type { NexusBackend } from "./nexusBackend.js";

export function registerMarketplaceHandlers(backend: NexusBackend): void {
  registerPluginHandlers(backend);
  registerSkillHandlers(backend);
  registerApiConfigHandlers(backend);
}

function registerPluginHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:plugins:list", () => backend.marketplace.getPlugins());
  ipcMain.handle("nexus:plugins:installed", () => backend.marketplace.getInstalledPlugins());
  ipcMain.handle("nexus:plugins:search", (_event, request: PluginSearchRequest) => {
    return backend.marketplace.getPlugins(request);
  });
  ipcMain.handle("nexus:plugins:install", (_event, id: string) => backend.marketplace.installPlugin(id));
  ipcMain.handle("nexus:plugins:uninstall", (_event, id: string) => backend.marketplace.uninstallPlugin(id));
  ipcMain.handle("nexus:plugins:toggle", (_event, id: string) => backend.marketplace.togglePlugin(id));
}

function registerSkillHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:skills:list", () => backend.marketplace.getSkills());
  ipcMain.handle("nexus:skills:installed", () => backend.marketplace.getInstalledSkills());
  ipcMain.handle("nexus:skills:search", (_event, request: SkillsSearchRequest) => {
    return backend.marketplace.getSkills(request);
  });
  ipcMain.handle("nexus:skills:install", (_event, id: string) => backend.marketplace.installSkill(id));
  ipcMain.handle("nexus:skills:uninstall", (_event, id: string) => backend.marketplace.uninstallSkill(id));
  ipcMain.handle("nexus:skills:toggle", (_event, id: string) => backend.marketplace.toggleSkill(id));
}

function registerApiConfigHandlers(backend: NexusBackend): void {
  ipcMain.handle("nexus:api:presets", () => backend.apiConfig.getPresets());
  ipcMain.handle("nexus:api:configs", () => backend.apiConfig.getConfigs());
  ipcMain.handle("nexus:api:add", (_event, config) => backend.apiConfig.addConfig(config));
  ipcMain.handle("nexus:api:update", (_event, id: string, updates) => backend.apiConfig.updateConfig(id, updates));
  ipcMain.handle("nexus:api:remove", (_event, id: string) => backend.apiConfig.removeConfig(id));
  ipcMain.handle("nexus:api:setActive", (_event, id: string | null) => backend.apiConfig.setActive(id));
  ipcMain.handle("nexus:api:active", () => backend.apiConfig.getActive());
  ipcMain.handle("nexus:api:test", (_event, id: string) => backend.apiConfig.testConnection(id));
}
