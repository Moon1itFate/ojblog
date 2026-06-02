import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { readHistory, READING_HISTORY_UPDATE_EVENT, writeHistory, type ReadingHistoryEntry } from '@lib/reading-history';

function formatVisitedTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function progressLabel(progress: number) {
  if (progress >= 96) return '已读完';
  if (progress >= 10) return `已读 ${progress}%`;
  return '刚开始';
}

export default function RecentReadingCard() {
  const [items, setItems] = useState<ReadingHistoryEntry[]>([]);
  const visibleItems = useMemo(() => items.slice(0, 3), [items]);

  useEffect(() => {
    const load = () => setItems(readHistory());
    load();
    window.addEventListener('storage', load);
    window.addEventListener(READING_HISTORY_UPDATE_EVENT, load);
    document.addEventListener('astro:page-load', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener(READING_HISTORY_UPDATE_EVENT, load);
      document.removeEventListener('astro:page-load', load);
    };
  }, []);

  const clearHistory = () => {
    writeHistory([]);
    setItems([]);
  };

  if (!visibleItems.length) return null;

  return (
    <section className="mt-5 w-full max-w-52 rounded-lg border border-primary/10 bg-white/55 p-3 text-left shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/35">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Icon icon="ri:book-open-line" className="h-4 w-4" />
          <span>最近读过</span>
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          onClick={clearHistory}
          aria-label="清空最近阅读"
          title="清空最近阅读"
        >
          <Icon icon="ri:close-line" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <motion.a
              key={item.href}
              href={item.href}
              className="group block rounded-md border border-transparent p-2 transition hover:border-primary/15 hover:bg-primary/8"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <div className="flex items-start gap-2">
                {item.cover ? (
                  <img src={item.cover} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon icon="ri:article-line" className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground transition group-hover:text-primary">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatVisitedTime(item.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#f7a4c0] to-[#9fc5ff]" style={{ width: `${item.progress}%` }} />
                </span>
                <span className="shrink-0">{progressLabel(item.progress)}</span>
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
