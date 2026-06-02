import { getPageviews } from '@lib/umami-stats';
import { formatCompactNumber } from '@lib/utils';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import type { UmamiStatsConfig } from '@/types/umami-stats';

interface Props {
  statsConfig: UmamiStatsConfig;
  label?: string;
  variant?: 'ghost' | 'glass' | 'cover';
}

export default function PageViewBadge({ statsConfig, label = '阅读', variant = 'ghost' }: Props) {
  const [pageviews, setPageviews] = useState<number | null | undefined>(undefined);
  const { baseUrl, websiteId, shareToken, path } = statsConfig;

  useEffect(() => {
    let cancelled = false;
    getPageviews({ baseUrl, websiteId, shareToken, path })
      .then((pv) => {
        if (!cancelled) setPageviews(pv);
      })
      .catch(() => {
        if (!cancelled) setPageviews(null);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, websiteId, shareToken, path]);

  if (pageviews === null) return null;

  const content = pageviews === undefined ? '...' : formatCompactNumber(pageviews);
  const className =
    variant === 'cover'
      ? 'inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-white shadow-lg backdrop-blur-md'
      : variant === 'glass'
        ? 'inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-primary shadow-sm'
        : 'inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary';

  return (
    <span className={className} title={pageviews === undefined ? undefined : `${pageviews.toLocaleString()} ${label}`}>
      <Icon icon="ri:eye-line" className="h-4 w-4" />
      <span className="font-medium">{content}</span>
      <span className="text-xs opacity-80">{label}</span>
    </span>
  );
}
