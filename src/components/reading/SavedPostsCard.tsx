import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { readSavedPosts, READING_HISTORY_UPDATE_EVENT, writeSavedPosts, type SavedPostEntry } from '@lib/reading-history';

function formatSavedTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes} 分钟前收藏`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前收藏`;
  const days = Math.floor(hours / 24);
  return `${days} 天前收藏`;
}

export default function SavedPostsCard() {
  const [items, setItems] = useState<SavedPostEntry[]>([]);
  const visibleItems = useMemo(() => items.slice(0, 3), [items]);

  useEffect(() => {
    const load = () => setItems(readSavedPosts());
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

  const removeItem = (href: string) => {
    const nextItems = items.filter((item) => item.href !== href);
    writeSavedPosts(nextItems);
    setItems(nextItems);
  };

  if (!visibleItems.length) return null;

  return (
    <section className="mt-3 w-full max-w-52 rounded-lg border border-primary/10 bg-white/55 p-3 text-left shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/35">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Icon icon="ri:bookmark-3-line" className="h-4 w-4" />
        <span>稍后阅读</span>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <motion.div
              key={item.href}
              className="group flex items-start gap-2 rounded-md border border-transparent p-2 transition hover:border-primary/15 hover:bg-primary/8"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {item.cover ? (
                <img src={item.cover} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon icon="ri:article-line" className="h-5 w-5" />
                </span>
              )}
              <a href={item.href} className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground transition group-hover:text-primary">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatSavedTime(item.savedAt)}</p>
              </a>
              <button
                type="button"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                onClick={() => removeItem(item.href)}
                aria-label="移除稍后阅读"
                title="移除稍后阅读"
              >
                <Icon icon="ri:close-line" className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
