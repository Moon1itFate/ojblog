export const READING_HISTORY_KEY = 'moonlit-fate:reading-history';
export const SAVED_POSTS_KEY = 'moonlit-fate:saved-posts';
export const READING_HISTORY_UPDATE_EVENT = 'reading-history:update';
export const READING_HISTORY_LIMIT = 8;
export const SAVED_POSTS_LIMIT = 12;

export interface ReadingHistoryEntry {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  category?: string;
  progress: number;
  updatedAt: number;
}

export interface SavedPostEntry {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  category?: string;
  savedAt: number;
}

function notifyReadingMemoryChanged() {
  window.dispatchEvent(new CustomEvent(READING_HISTORY_UPDATE_EVENT));
}

export function clampReadingProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function readHistory(): ReadingHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(READING_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ReadingHistoryEntry => Boolean(item?.href && item?.title))
      .map((item) => ({
        ...item,
        progress: clampReadingProgress(item.progress),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      }))
      .slice(0, READING_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function writeHistory(entries: ReadingHistoryEntry[]) {
  try {
    window.localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(entries.slice(0, READING_HISTORY_LIMIT)));
    notifyReadingMemoryChanged();
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

export function upsertHistoryEntry(entry: ReadingHistoryEntry) {
  const normalizedEntry = {
    ...entry,
    progress: clampReadingProgress(entry.progress),
    updatedAt: entry.updatedAt || Date.now(),
  };
  const rest = readHistory().filter((item) => item.href !== normalizedEntry.href);
  writeHistory([normalizedEntry, ...rest]);
}

export function readSavedPosts(): SavedPostEntry[] {
  try {
    const raw = window.localStorage.getItem(SAVED_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedPostEntry => Boolean(item?.href && item?.title))
      .map((item) => ({
        ...item,
        savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
      }))
      .slice(0, SAVED_POSTS_LIMIT);
  } catch {
    return [];
  }
}

export function writeSavedPosts(entries: SavedPostEntry[]) {
  try {
    window.localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(entries.slice(0, SAVED_POSTS_LIMIT)));
    notifyReadingMemoryChanged();
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

export function isPostSaved(href: string) {
  return readSavedPosts().some((item) => item.href === href);
}

export function toggleSavedPost(entry: SavedPostEntry) {
  const savedPosts = readSavedPosts();
  const alreadySaved = savedPosts.some((item) => item.href === entry.href);
  if (alreadySaved) {
    writeSavedPosts(savedPosts.filter((item) => item.href !== entry.href));
    return false;
  }

  writeSavedPosts([{ ...entry, savedAt: Date.now() }, ...savedPosts.filter((item) => item.href !== entry.href)]);
  return true;
}
