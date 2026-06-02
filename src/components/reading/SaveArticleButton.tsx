import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { isPostSaved, toggleSavedPost } from '@lib/reading-history';
import { cn } from '@lib/utils';

interface Props {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  category?: string;
}

export default function SaveArticleButton({ href, title, description, cover, category }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isPostSaved(href));
  }, [href]);

  const handleToggle = () => {
    setSaved(
      toggleSavedPost({
        href,
        title,
        description,
        cover,
        category,
        savedAt: Date.now(),
      }),
    );
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        saved
          ? 'border-primary/20 bg-primary/15 text-primary shadow-sm'
          : 'border-muted-foreground/15 bg-white/40 text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-primary dark:bg-white/5',
      )}
      onClick={handleToggle}
      aria-pressed={saved}
      title={saved ? '取消稍后阅读' : '加入稍后阅读'}
    >
      <Icon icon={saved ? 'ri:bookmark-fill' : 'ri:bookmark-line'} className="h-4 w-4" />
      <span>{saved ? '已收藏' : '稍后读'}</span>
    </button>
  );
}
