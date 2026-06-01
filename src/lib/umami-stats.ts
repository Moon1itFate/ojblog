import type { UmamiConfig } from '@lib/config/types';
import type {
  UmamiDataPoint,
  UmamiExpandedMetricRow,
  UmamiMetricRow,
  UmamiMetricType,
  UmamiPageviewSeries,
  UmamiSessionStats,
  UmamiStatsConfig,
  UmamiStatsSummary,
} from '@/types/umami-stats';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Share slug -> JWT token cache (JWT is short-lived, refresh every 30 min)
const JWT_CACHE_TTL = 30 * 60 * 1000;
let jwtCache: { token: string; expiresAt: number; key: string } | null = null;

function appendBaseApiPath(baseUrl: string, pathname: string) {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}${pathname}`;
  return url;
}

function appendTimeRange(params: URLSearchParams, config: UmamiStatsConfig, days?: number) {
  const endAt = config.endAt ?? Date.now();
  const startAt = config.startAt ?? (days ? endAt - days * 24 * 60 * 60 * 1000 : 0);
  params.set('startAt', startAt.toString());
  params.set('endAt', endAt.toString());
  if (config.path) params.set('path', config.path);
}

function readUmamiValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value?: unknown }).value;
    return typeof nested === 'number' ? nested : 0;
  }
  return 0;
}

function normalizePoint(point: unknown): UmamiDataPoint {
  const row = point && typeof point === 'object' ? (point as Record<string, unknown>) : {};
  return {
    x: typeof row.x === 'string' ? row.x : '',
    y: readUmamiValue(row.y),
  };
}

function normalizeMetricRow(row: unknown): UmamiMetricRow {
  const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
  return {
    x: typeof item.x === 'string' ? item.x : typeof item.name === 'string' ? item.name : '',
    y: readUmamiValue(item.y ?? item.pageviews ?? item.visitors ?? item.visits),
  };
}

function normalizeExpandedMetricRow(row: unknown): UmamiExpandedMetricRow {
  const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
  return {
    name: typeof item.name === 'string' ? item.name : typeof item.x === 'string' ? item.x : '',
    pageviews: readUmamiValue(item.pageviews ?? item.y),
    visitors: readUmamiValue(item.visitors),
    visits: readUmamiValue(item.visits),
    bounces: readUmamiValue(item.bounces),
    totaltime: readUmamiValue(item.totaltime),
  };
}

/** Exchange a share slug for a JWT token via GET /api/share/<slug> */
async function resolveShareToken(baseUrl: string, shareSlug: string): Promise<string> {
  const key = `${baseUrl}:${shareSlug}`;
  if (jwtCache && jwtCache.key === key && jwtCache.expiresAt > Date.now()) {
    return jwtCache.token;
  }

  const url = appendBaseApiPath(baseUrl, `/api/share/${encodeURIComponent(shareSlug)}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve share token: ${response.status} ${response.statusText}`);
  }

  const data: { token: string; websiteId: string } = await response.json();
  jwtCache = { token: data.token, expiresAt: Date.now() + JWT_CACHE_TTL, key };
  return data.token;
}

async function requestUmamiApi<T>(config: UmamiStatsConfig, pathname: string, params?: URLSearchParams): Promise<T> {
  const { baseUrl, shareToken: shareSlug } = config;
  const jwt = await resolveShareToken(baseUrl, shareSlug);

  const url = appendBaseApiPath(baseUrl, pathname);
  if (params) url.search = params.toString();

  const headers = new Headers({
    accept: 'application/json',
    'x-umami-share-token': jwt,
  });

  const response = await fetch(url.toString(), { method: 'GET', headers });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Umami API error: ${text}`);
  }
  return await response.json();
}

async function getSessionStats(config: UmamiStatsConfig): Promise<UmamiSessionStats> {
  const { websiteId } = config;

  const params = new URLSearchParams();
  appendTimeRange(params, config);

  return requestUmamiApi<UmamiSessionStats>(config, `/api/websites/${encodeURIComponent(websiteId)}/stats`, params);
}

interface CacheEntry {
  value: number | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const objectCache = new Map<string, { value: unknown; expiresAt: number }>();
const inflightRequests = new Map<string, Promise<number | null>>();

function getCacheKey(config: UmamiStatsConfig): string {
  return `${config.baseUrl}:${config.websiteId}:${config.path ?? ''}:${config.startAt ?? ''}:${config.endAt ?? ''}`;
}

export function getPageviews(config: UmamiStatsConfig): Promise<number | null> {
  const key = getCacheKey(config);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);

  const inflight = inflightRequests.get(key);
  if (inflight) return inflight;

  const promise = getSessionStats(config)
    .then((stats) => {
      const pv = typeof stats.pageviews === 'number' ? stats.pageviews : stats.pageviews.value;
      cache.set(key, { value: pv, expiresAt: Date.now() + CACHE_TTL });
      return pv;
    })
    .catch((error) => {
      console.error('Failed to fetch Umami pageviews:', error);
      if (import.meta.env.DEV) {
        console.warn(
          `[umami-stats] Fetch failed for key "${key}". Check that your Umami endpoint, website ID, and share token are correct in config/site.yaml.`,
        );
      }
      cache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL });
      return null;
    })
    .finally(() => inflightRequests.delete(key));

  inflightRequests.set(key, promise);
  return promise;
}

export async function getOverviewStats(config: UmamiStatsConfig, days?: number): Promise<UmamiStatsSummary | null> {
  const key = `${getCacheKey(config)}:overview:${days ?? 'all'}`;
  const cached = objectCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as UmamiStatsSummary;

  try {
    const params = new URLSearchParams();
    appendTimeRange(params, config, days);
    const stats = await requestUmamiApi<UmamiSessionStats>(
      config,
      `/api/websites/${encodeURIComponent(config.websiteId)}/stats`,
      params,
    );
    const summary: UmamiStatsSummary = {
      pageviews: readUmamiValue(stats.pageviews),
      visitors: readUmamiValue(stats.visitors),
      visits: readUmamiValue(stats.visits),
      bounces: readUmamiValue(stats.bounces),
      totaltime: readUmamiValue(stats.totaltime),
    };
    objectCache.set(key, { value: summary, expiresAt: Date.now() + CACHE_TTL });
    return summary;
  } catch (error) {
    console.error('Failed to fetch Umami overview stats:', error);
    return null;
  }
}

export async function getPageviewSeries(config: UmamiStatsConfig, days = 30, unit = 'day'): Promise<UmamiPageviewSeries | null> {
  try {
    const params = new URLSearchParams();
    appendTimeRange(params, config, days);
    params.set('unit', unit);
    params.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai');

    const data = await requestUmamiApi<Record<string, unknown>>(
      config,
      `/api/websites/${encodeURIComponent(config.websiteId)}/pageviews`,
      params,
    );
    const pageviews = Array.isArray(data.pageviews) ? data.pageviews.map(normalizePoint) : [];
    const sessions = Array.isArray(data.sessions) ? data.sessions.map(normalizePoint) : [];
    return { pageviews, sessions };
  } catch (error) {
    console.error('Failed to fetch Umami pageview series:', error);
    return null;
  }
}

export async function getMetricRows(config: UmamiStatsConfig, type: UmamiMetricType, days = 30): Promise<UmamiMetricRow[] | null> {
  try {
    const params = new URLSearchParams();
    appendTimeRange(params, config, days);
    params.set('type', type);

    const data = await requestUmamiApi<unknown[]>(
      config,
      `/api/websites/${encodeURIComponent(config.websiteId)}/metrics`,
      params,
    );
    return Array.isArray(data) ? data.map(normalizeMetricRow).filter((row) => row.x) : [];
  } catch (error) {
    console.error(`Failed to fetch Umami ${type} metrics:`, error);
    return null;
  }
}

export async function getExpandedMetricRows(
  config: UmamiStatsConfig,
  type: UmamiMetricType,
  days = 30,
): Promise<UmamiExpandedMetricRow[] | null> {
  try {
    const params = new URLSearchParams();
    appendTimeRange(params, config, days);
    params.set('type', type);

    const data = await requestUmamiApi<unknown[]>(
      config,
      `/api/websites/${encodeURIComponent(config.websiteId)}/metrics/expanded`,
      params,
    );
    return Array.isArray(data) ? data.map(normalizeExpandedMetricRow).filter((row) => row.name) : [];
  } catch (error) {
    console.error(`Failed to fetch expanded Umami ${type} metrics:`, error);
    return null;
  }
}

/** Normalize path to strip trailing slash for consistent Umami matching */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function createUmamiStatsConfig(config: UmamiConfig, path?: string): UmamiStatsConfig | null {
  const token = config.statistics_display?.token;
  if (!token) return null;
  return {
    baseUrl: config.endpoint,
    websiteId: config.id,
    shareToken: token,
    path: path ? normalizePath(path) : undefined,
  };
}
