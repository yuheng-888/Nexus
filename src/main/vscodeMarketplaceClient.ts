import type { Plugin, PluginSearchRequest } from "../contracts.js";
import type { FetchLike } from "./skillsMpClient.js";

const MARKETPLACE_ENDPOINT = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
const MARKETPLACE_ACCEPT = "application/json;api-version=7.2-preview.1;excludeUrls=true";
const TARGET_PLATFORM_FILTER = 8;
const SEARCH_TEXT_FILTER = 10;
const QUERY_FLAGS = 914;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 24;
const VS_CODE_TARGET = "Microsoft.VisualStudio.Code";
const VSIX_ASSET_TYPE = "Microsoft.VisualStudio.Services.VSIXPackage";

interface MarketplaceExtension {
  readonly categories?: readonly string[];
  readonly displayName?: string;
  readonly extensionName?: string;
  readonly lastUpdated?: string;
  readonly publisher?: MarketplacePublisher;
  readonly shortDescription?: string;
  readonly statistics?: readonly MarketplaceStatistic[];
  readonly versions?: readonly MarketplaceVersion[];
}

interface MarketplacePublisher {
  readonly displayName?: string;
  readonly publisherName?: string;
}

interface MarketplaceStatistic {
  readonly statisticName?: string;
  readonly value?: number;
}

interface MarketplaceVersion {
  readonly files?: readonly MarketplaceFile[];
  readonly version?: string;
}

interface MarketplaceFile {
  readonly assetType?: string;
  readonly source?: string;
}

export async function searchVsCodeMarketplace(
  request: PluginSearchRequest,
  fetcher: FetchLike
): Promise<readonly Plugin[]> {
  const response = await fetcher(MARKETPLACE_ENDPOINT, {
    body: JSON.stringify(buildQueryBody(request)),
    headers: {
      Accept: MARKETPLACE_ACCEPT,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`VS Code Marketplace 查询失败: HTTP ${response.status}`);
  }

  return parseMarketplaceResponse(await response.json());
}

function buildQueryBody(request: PluginSearchRequest): Record<string, unknown> {
  return {
    assetTypes: [VSIX_ASSET_TYPE],
    filters: [{
      criteria: buildCriteria(request.query),
      direction: 2,
      pageNumber: DEFAULT_PAGE_NUMBER,
      pageSize: DEFAULT_PAGE_SIZE,
      sortBy: 0,
      sortOrder: 0
    }],
    flags: QUERY_FLAGS
  };
}

function buildCriteria(query: string | undefined): readonly Record<string, unknown>[] {
  const trimmed = query?.trim() ?? "";
  const base = [{ filterType: TARGET_PLATFORM_FILTER, value: VS_CODE_TARGET }];

  if (trimmed === "") {
    return base;
  }

  return [...base, { filterType: SEARCH_TEXT_FILTER, value: trimmed }];
}

function parseMarketplaceResponse(data: unknown): readonly Plugin[] {
  if (!isRecord(data)) {
    throw new Error("VS Code Marketplace 返回格式无效");
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const first = isRecord(results[0]) ? results[0] : {};
  const extensions = Array.isArray(first.extensions) ? first.extensions : [];

  return extensions.filter(isRecord).map(toPlugin);
}

function toPlugin(extension: Record<string, unknown>): Plugin {
  const version = getLatestVersion(extension);
  const publisher = readPublisher(extension.publisher);
  const extensionName = readString(extension.extensionName);
  const name = readString(extension.displayName) || extensionName;

  return {
    author: publisher.displayName,
    category: readCategory(extension),
    description: readString(extension.shortDescription),
    downloads: readStatistic(extension.statistics, "install"),
    enabled: false,
    extensionName,
    icon: "🔌",
    id: `vscode:${publisher.name}.${extensionName}`,
    installed: false,
    marketplaceUrl: getMarketplaceUrl(publisher.name, extensionName),
    name,
    publisher: publisher.name,
    rating: readStatistic(extension.statistics, "averagerating"),
    source: "vscode",
    updatedAt: readString(extension.lastUpdated),
    version: version.version,
    vsixUrl: version.vsixUrl
  };
}

function readPublisher(value: unknown): { readonly displayName: string; readonly name: string } {
  const publisher = isRecord(value) ? value : {};
  const name = readString(publisher.publisherName);

  return {
    displayName: readString(publisher.displayName) || name,
    name
  };
}

function getLatestVersion(extension: Record<string, unknown>): {
  readonly version: string;
  readonly vsixUrl: string | undefined;
} {
  const versions = Array.isArray(extension.versions) ? extension.versions : [];
  const version = versions.filter(isRecord).find(hasVsixFile);

  return {
    version: readString(version?.version),
    vsixUrl: readVsixUrl(version)
  };
}

function hasVsixFile(version: Record<string, unknown>): boolean {
  return readVsixUrl(version) !== undefined;
}

function readVsixUrl(version: Record<string, unknown> | undefined): string | undefined {
  const files = Array.isArray(version?.files) ? version.files : [];
  const file = files.filter(isRecord).find((item) => item.assetType === VSIX_ASSET_TYPE);
  const source = readString(file?.source);

  return source === "" ? undefined : source;
}

function readCategory(extension: Record<string, unknown>): string {
  const categories = Array.isArray(extension.categories) ? extension.categories : [];
  const category = categories.find((item) => typeof item === "string");

  return category ?? "VS Code";
}

function readStatistic(value: unknown, name: string): number {
  const statistics = Array.isArray(value) ? value : [];
  const statistic = statistics.filter(isRecord).find((item) => item.statisticName === name);

  return typeof statistic?.value === "number" ? statistic.value : 0;
}

function getMarketplaceUrl(publisher: string, extensionName: string): string {
  const itemName = encodeURIComponent(`${publisher}.${extensionName}`);

  return `https://marketplace.visualstudio.com/items?itemName=${itemName}`;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
