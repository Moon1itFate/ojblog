import { getOverviewStats } from '@lib/umami-stats';
import { formatCompactNumber } from '@lib/utils';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { UmamiStatsConfig } from '@/types/umami-stats';

interface Props {
  statsConfig: UmamiStatsConfig;
  effectEnabled?: boolean;
}

const VISITOR_SEEN_KEY = 'moonlit-fate:visitor-seen';
const VISITOR_EFFECT_KEY = 'moonlit-fate:visitor-effect-session';

export default function VisitorGlowBadge({ statsConfig, effectEnabled = true }: Props) {
  const [visitors, setVisitors] = useState<number | null | undefined>(undefined);
  const [showBloom, setShowBloom] = useState(false);
  const { baseUrl, websiteId, shareToken } = statsConfig;

  useEffect(() => {
    let cancelled = false;
    getOverviewStats({ baseUrl, websiteId, shareToken })
      .then((stats) => {
        if (!cancelled) setVisitors(stats?.visitors ?? stats?.pageviews ?? null);
      })
      .catch(() => {
        if (!cancelled) setVisitors(null);
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, websiteId, shareToken]);

  useEffect(() => {
    if (!effectEnabled) return;
    const hasVisited = localStorage.getItem(VISITOR_SEEN_KEY);
    const hasPlayedThisSession = sessionStorage.getItem(VISITOR_EFFECT_KEY);
    localStorage.setItem(VISITOR_SEEN_KEY, String(Date.now()));

    if (!hasVisited && !hasPlayedThisSession) {
      sessionStorage.setItem(VISITOR_EFFECT_KEY, '1');
      setShowBloom(true);
      const timer = window.setTimeout(() => setShowBloom(false), 3800);
      return () => window.clearTimeout(timer);
    }
  }, [effectEnabled]);

  if (visitors === null) return null;

  const display = visitors === undefined ? '...' : formatCompactNumber(visitors);

  return (
    <span className="relative inline-flex items-center">
      <a
        href="/stats"
        className="group relative inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-sm text-white shadow-lg backdrop-blur-md transition hover:border-primary/40 hover:bg-primary/20"
        aria-label="访问统计"
        title="访问统计"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f7a4c0]/30 via-[#ffffff]/10 to-[#9fc5ff]/30 opacity-0 transition group-hover:opacity-100" />
        <Icon icon="ri:user-heart-line" className="relative h-4 w-4" />
        <span className="relative font-semibold">{display}</span>
        <span className="relative text-xs opacity-80">人来过</span>
        {showBloom && (
          <>
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#ffd6e5] shadow-[0_0_16px_rgba(255,214,229,0.9)]" />
            <span className="absolute inset-0 animate-ping rounded-full border border-[#ffd6e5]/70" />
          </>
        )}
      </a>

      <AnimatePresence>
        {showBloom && (
          <motion.div
            className="pointer-events-none fixed right-6 top-20 z-60 rounded-lg border border-white/50 bg-white/80 px-4 py-3 text-sm text-zinc-700 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-100"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              <Icon icon="ri:sparkling-2-line" className="h-5 w-5 text-primary" />
              <span>欢迎来到 Moonlit Fate</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
