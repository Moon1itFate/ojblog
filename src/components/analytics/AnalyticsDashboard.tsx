import {
  getExpandedMetricRows,
  getMetricRows,
  getOverviewStats,
  getPageviewSeries,
} from '@lib/umami-stats';
import { formatCompactNumber } from '@lib/utils';
import { useEffect, useMemo, useState } from 'react';
import type {
  UmamiDataPoint,
  UmamiExpandedMetricRow,
  UmamiMetricRow,
  UmamiPageviewSeries,
  UmamiStatsConfig,
  UmamiStatsSummary,
} from '@/types/umami-stats';

type PostLink = {
  title: string;
  path: string;
  category?: string;
};

type DashboardData = {
  overview: UmamiStatsSummary;
  allTime: UmamiStatsSummary;
  series: UmamiPageviewSeries;
  topArticles: ArticleViewRow[];
  referrers: MetricDisplayRow[];
  devices: MetricDisplayRow[];
};

type ArticleViewRow = {
  title: string;
  path: string;
  category?: string;
  pageviews: number;
  visitors: number;
};

type MetricDisplayRow = {
  name: string;
  pageviews: number;
  visitors: number;
};

interface Props {
  statsConfig: UmamiStatsConfig;
  posts: PostLink[];
  initialDays?: number;
}

const RANGE_OPTIONS = [7, 30, 90] as const;
function normalizePath(value: string) {
  if (!value) return '/';
  try {
    const url = value.startsWith('http') ? new URL(value) : new URL(value, 'https://example.com');
    const pathname = decodeURIComponent(url.pathname);
    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  } catch {
    const path = decodeURIComponent(value.split(/[?#]/)[0] ?? value);
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  }
}

function getMetricName(row: UmamiExpandedMetricRow | UmamiMetricRow) {
  return 'name' in row ? row.name : row.x;
}

function getMetricPageviews(row: UmamiExpandedMetricRow | UmamiMetricRow) {
  return 'pageviews' in row ? row.pageviews : row.y;
}

function getMetricVisitors(row: UmamiExpandedMetricRow | UmamiMetricRow) {
  return 'visitors' in row ? row.visitors : 0;
}

function titleFromPath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/-/g, ' ') ?? path;
}

function buildTopArticles(rows: Array<UmamiExpandedMetricRow | UmamiMetricRow>, posts: PostLink[]): ArticleViewRow[] {
  const postMap = new Map(posts.map((post) => [normalizePath(post.path), post]));

  return rows
    .map((row) => {
      const path = normalizePath(getMetricName(row));
      const post = postMap.get(path);
      return {
        title: post?.title ?? titleFromPath(path),
        path,
        category: post?.category,
        pageviews: getMetricPageviews(row),
        visitors: getMetricVisitors(row),
      };
    })
    .filter((row) => row.path.includes('/post/') && row.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 8);
}

function buildMetricRows(rows: Array<UmamiExpandedMetricRow | UmamiMetricRow> | null, fallback = '直接访问'): MetricDisplayRow[] {
  return (rows ?? [])
    .map((row) => {
      const name = getMetricName(row);
      return {
        name: name === '' || name === '(none)' ? fallback : name,
        pageviews: getMetricPageviews(row),
        visitors: getMetricVisitors(row),
      };
    })
    .filter((row) => row.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 6);
}

function formatDuration(seconds: number) {
  if (!seconds) return '0m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-800 dark:text-zinc-100">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

function ActivityChart({ points }: { points: UmamiDataPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.y));

  if (!points.length) {
    return (
      <div className="border-border/60 bg-muted/30 flex h-56 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        暂无趋势数据
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex h-56 items-end gap-1.5">
        {points.map((point) => (
          <div key={point.x} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-[#f07aa0] via-[#f3a6bf] to-[#c7a9ff] transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(6, (point.y / max) * 100)}%` }}
              title={`${formatDateLabel(point.x)}: ${point.y.toLocaleString()} PV`}
            />
            <span className="hidden text-[10px] text-muted-foreground md:hidden xl:block">{formatDateLabel(point.x)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingList({ rows, emptyText }: { rows: MetricDisplayRow[]; emptyText: string }) {
  const max = Math.max(1, ...rows.map((row) => row.pageviews));

  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.name} className="space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">{row.name}</span>
            <span className="shrink-0 text-muted-foreground">{formatCompactNumber(row.pageviews)} PV</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#f07aa0] to-[#9fc5ff]"
              style={{ width: `${Math.max(6, (row.pageviews / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleRanking({ rows }: { rows: ArticleViewRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.pageviews));

  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">暂无文章阅读数据</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <a key={row.path} href={row.path} className="group block space-y-2 rounded-lg border border-transparent p-2 transition hover:border-primary/30 hover:bg-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-800 transition group-hover:text-primary dark:text-zinc-100">
                {index + 1}. {row.title}
              </p>
              {row.category ? <p className="mt-0.5 text-xs text-muted-foreground">{row.category}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold">{formatCompactNumber(row.pageviews)} PV</p>
              <p className="text-xs text-muted-foreground">{row.visitors ? `${formatCompactNumber(row.visitors)} UV` : row.path}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#f07aa0] via-[#f3a6bf] to-[#9fc5ff]"
              style={{ width: `${Math.max(6, (row.pageviews / max) * 100)}%` }}
            />
          </div>
        </a>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ statsConfig, posts, initialDays = 30 }: Props) {
  const [range, setRange] = useState<number>(initialDays);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedPosts = useMemo(
    () => posts.map((post) => ({ ...post, path: normalizePath(post.path) })),
    [posts],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadStats() {
      const [overview, allTime, series, pathExpanded, pathSimple, referrerExpanded, referrerSimple, deviceExpanded, deviceSimple] =
        await Promise.all([
          getOverviewStats(statsConfig, range),
          getOverviewStats(statsConfig),
          getPageviewSeries(statsConfig, range),
          getExpandedMetricRows(statsConfig, 'path', range),
          getMetricRows(statsConfig, 'path', range),
          getExpandedMetricRows(statsConfig, 'referrer', range),
          getMetricRows(statsConfig, 'referrer', range),
          getExpandedMetricRows(statsConfig, 'device', range),
          getMetricRows(statsConfig, 'device', range),
        ]);

      if (cancelled) return;

      if (!overview || !allTime || !series) {
        throw new Error('统计接口暂时不可用');
      }

      setData({
        overview,
        allTime,
        series,
        topArticles: buildTopArticles(pathExpanded ?? pathSimple ?? [], normalizedPosts),
        referrers: buildMetricRows(referrerExpanded ?? referrerSimple, '直接访问'),
        devices: buildMetricRows(deviceExpanded ?? deviceSimple, '未知设备'),
      });
      setLoading(false);
    }

    loadStats().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : '统计接口暂时不可用');
      setData(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [statsConfig, range, normalizedPosts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Public blog analytics</p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-800 dark:text-zinc-100">访问统计</h2>
        </div>
        <div className="inline-flex rounded-lg border border-white/70 bg-white/75 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
          {RANGE_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                range === days ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
              onClick={() => setRange(days)}
            >
              {days} 天
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-white/60 dark:bg-zinc-900/60" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
          {error}。请检查 `config/site.yaml` 中的 Umami endpoint、website id 和 share token。
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={`${range} 天访问量`} value={formatCompactNumber(data.overview.pageviews)} hint={`累计 ${data.allTime.pageviews.toLocaleString()} PV`} />
            <StatCard label="独立访客" value={formatCompactNumber(data.overview.visitors)} hint="按 Umami 访客口径统计" />
            <StatCard label="访问次数" value={formatCompactNumber(data.overview.visits)} hint={`${range} 天会话数`} />
            <StatCard label="总阅读时长" value={formatDuration(data.overview.totaltime)} hint="由统计后端估算" />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">访问趋势</h3>
              <span className="text-sm text-muted-foreground">{range} 天 PV</span>
            </div>
            <ActivityChart points={data.series.pageviews} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section className="rounded-lg border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">热门文章</h3>
                <span className="text-sm text-muted-foreground">Top 8</span>
              </div>
              <ArticleRanking rows={data.topArticles} />
            </section>

            <div className="space-y-6">
              <section className="rounded-lg border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
                <h3 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-100">访问来源</h3>
                <RankingList rows={data.referrers} emptyText="暂无来源数据" />
              </section>

              <section className="rounded-lg border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
                <h3 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-100">访问设备</h3>
                <RankingList rows={data.devices} emptyText="暂无设备数据" />
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
