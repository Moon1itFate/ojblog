import type { OjSubmission } from './types';

const NOWCODER_PLATFORM = 'nowcoder';
const NOWCODER_DEFAULT_TAGS = ['NowCoder / public activity'];
const NOWCODER_ACM_TAGS = ['NowCoder ACM / practice'];
const NOWCODER_USER_ID_PATTERN = /(?:nowcoder\.com\/users\/|ac\.nowcoder\.com\/acm\/contest\/profile\/)?(\d+)/;

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
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
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

function extractTableCells(rowHtml: string) {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function normalizeNowCoderAcmTime(value: string) {
  const normalized = value.trim().replace(/\//g, '-');
  if (!normalized) return new Date().toISOString();

  const parsed = new Date(`${normalized.replace(' ', 'T')}+08:00`);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function toNumber(value: string) {
  const number = Number.parseFloat(stripHtml(value));
  return Number.isFinite(number) ? number : undefined;
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
  if (lists.length === 0) {
    throw new Error('牛客公开页未返回刷题列表，可能是账号 ID 错误或做题动态未公开');
  }

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

export function parseNowCoderAcmPracticeSubmissions(html: string, userId: string): OjSubmission[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const submissions = rows.flatMap((rowMatch) => {
    const cells = extractTableCells(rowMatch[1]);
    if (cells.length < 9 || !/\/acm\/problem\//i.test(cells[1] ?? '')) return [];

    const submissionId = cells[0].match(/submissionId=(\d+)/i)?.[1] ?? stripHtml(cells[0]).match(/\d+/)?.[0];
    const problemId = cells[1].match(/\/acm\/problem\/(\d+)/i)?.[1];
    if (!submissionId || !problemId) return [];

    const problemName = stripHtml(cells[1]) || `NowCoder ACM Problem ${problemId}`;
    const verdict = stripHtml(cells[2]) || 'UNKNOWN';
    const score = toNumber(cells[3]);
    const language = stripHtml(cells[7]) || undefined;
    const submittedAt = normalizeNowCoderAcmTime(stripHtml(cells[8]));
    const accepted = verdict.includes('答案正确') || verdict.toUpperCase() === 'AC' || (score ?? 0) >= 100;

    return [
      {
        id: `${NOWCODER_PLATFORM}-acm:${submissionId}`,
        platform: NOWCODER_PLATFORM,
        problemKey: `acm-${problemId}`,
        problemName,
        contestId: undefined,
        verdict,
        accepted,
        tags: NOWCODER_ACM_TAGS,
        rating: undefined,
        language,
        submittedAt,
        sourceUrl: `https://ac.nowcoder.com/acm/contest/view-submission?submissionId=${encodeURIComponent(
          submissionId,
        )}&returnHomeType=1&uid=${encodeURIComponent(userId)}`,
      } satisfies OjSubmission,
    ];
  });

  if (submissions.length === 0) {
    throw new Error('牛客 ACM 竞赛主页未返回公开练习记录，可能是账号 ID 错误或练习记录未公开');
  }

  return submissions.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}
