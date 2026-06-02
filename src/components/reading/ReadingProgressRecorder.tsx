import { useEffect } from 'react';
import { clampReadingProgress, upsertHistoryEntry } from '@lib/reading-history';

interface Props {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  category?: string;
}

function getScrollProgress() {
  const root = document.documentElement;
  const scrollable = root.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return clampReadingProgress((window.scrollY / scrollable) * 100);
}

export default function ReadingProgressRecorder({ href, title, description, cover, category }: Props) {
  useEffect(() => {
    let frame = 0;

    const persist = () => {
      upsertHistoryEntry({
        href,
        title,
        description,
        cover,
        category,
        progress: getScrollProgress(),
        updatedAt: Date.now(),
      });
    };

    const schedulePersist = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        persist();
      });
    };

    persist();
    window.addEventListener('scroll', schedulePersist, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('astro:before-swap', persist);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      persist();
      window.removeEventListener('scroll', schedulePersist);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('astro:before-swap', persist);
    };
  }, [href, title, description, cover, category]);

  return null;
}
