import type { OjSubmission } from './types';

const NOWCODER_PLATFORM = 'nowcoder';
const NOWCODER_DEFAULT_TAGS = ['NowCoder / public activity'];
const NOWCODER_USER_ID_PATTERN = /(?:nowcoder\.com\/users\/)?(\d+)/;

interface NowCoderInitialState {
  prefetchData?: Record<
    string,
    {
      list?: NowCoderTestRecord[];
    }
  >;
}

interface NowCoderTestRecord {
  id: number;
  paperId?: number;
  name?: string;
  time?: number | null;
  score?: number | null;
  userId?: number;
  finish?: boolean;
  participatedCnt?: number;
  status?: number;
  rightRate?: number | null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function findJsonObjectEnd(source: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  throw new Error('牛客公开刷题动态 JSON 截取失败');
}

function extractInitialState(html: string): NowCoderInitialState {
  const marker = 'window.__INITIAL_STATE__=';
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error('牛客页面未包含公开刷题动态数据');
  }

  const jsonStart = start + marker.length;
  const firstBrace = html.indexOf('{', jsonStart);
  if (firstBrace < 0) {
    throw new Error('牛客公开刷题动态 JSON 起始位置无效');
  }

  const jsonEnd = findJsonObjectEnd(html, firstBrace);
  const raw = html.slice(firstBrace, jsonEnd).trim();
  return JSON.parse(decodeHtmlEntities(raw)) as NowCoderInitialState;
}

function normalizeNowCoderTime(time: number | null | undefined) {
  if (!time) return new Date().toISOString();
  return new Date(time).toISOString();
}

function buildNowCoderUrl(userId: string, record: NowCoderTestRecord) {
  if (record.paperId) return `https://www.nowcoder.com/users/${encodeURIComponent(userId)}/tests`;
  return `https://www.nowcoder.com/users/${encodeURIComponent(userId)}/tests`;
}

export function normalizeNowCoderUserId(input: string) {
  const value = input.trim();
  const matched = value.match(NOWCODER_USER_ID_PATTERN);
  return matched?.[1] ?? value;
}

export function parseNowCoderSubmissions(html: string, userId: string): OjSubmission[] {
  const state = extractInitialState(html);
  const lists = Object.values(state.prefetchData ?? {})
    .flatMap((entry) => entry.list ?? [])
    .filter((record) => typeof record.id === 'number');

  return lists
    .map((record) => {
      const problemKey = record.paperId ? String(record.paperId) : String(record.id);
      const name = record.name?.trim() || `牛客刷题记录 ${record.id}`;
      const verdict = record.finish ? 'FINISHED' : 'IN_PROGRESS';
      return {
        id: `${NOWCODER_PLATFORM}:${record.id}`,
        platform: NOWCODER_PLATFORM,
        problemKey,
        problemName: name,
        contestId: record.paperId ? String(record.paperId) : undefined,
        verdict,
        accepted: Boolean(record.finish && (record.score ?? 0) > 0),
        tags: NOWCODER_DEFAULT_TAGS,
        rating: undefined,
        language: undefined,
        submittedAt: normalizeNowCoderTime(record.time),
        sourceUrl: buildNowCoderUrl(userId, record),
      } satisfies OjSubmission;
    })
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}
