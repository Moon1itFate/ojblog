import type { ContestRecord, OjSubmission } from './types';

const LUOGU_PLATFORM = 'luogu';
const LUOGU_USER_ID_PATTERN = /(?:luogu\.com\.cn\/user\/)?(\d+)/;
const LUOGU_DIFFICULTY_LABELS: Record<number, string> = {
  0: '暂无评定',
  1: '入门',
  2: '普及-',
  3: '普及/提高-',
  4: '普及+/提高',
  5: '提高+/省选-',
  6: '省选/NOI-',
  7: 'NOI/NOI+/CTSC',
};

interface LuoguProblemRecord {
  pid: string;
  type?: string;
  name?: string;
  difficulty?: number;
}

interface LuoguEloRecord {
  rating?: number;
  time?: number;
  prevDiff?: number;
  contest?: {
    id?: number;
    name?: string;
    startTime?: number;
    endTime?: number;
  };
  previous?: LuoguEloRecord;
}

interface LuoguPracticePayload {
  status?: number;
  code?: number;
  data?: {
    passed?: LuoguProblemRecord[];
    submitted?: LuoguProblemRecord[];
    privacy?: boolean;
    elo?: LuoguEloRecord[];
    user?: {
      uid?: number;
      name?: string;
    };
  };
  currentData?: {
    errorMessage?: string;
  };
}

function toIsoDate(seconds: number | undefined, fallback: string) {
  if (!seconds) return fallback;
  return new Date(seconds * 1000).toISOString();
}

function luoguProblemUrl(pid: string) {
  return `https://www.luogu.com.cn/problem/${encodeURIComponent(pid)}`;
}

function luoguProblemTags(problem: LuoguProblemRecord, state: 'passed' | 'submitted') {
  const tags = [state === 'passed' ? '洛谷 / 已通过题目' : '洛谷 / 尝试题目'];
  if (typeof problem.difficulty === 'number') {
    tags.push(`洛谷难度 / ${LUOGU_DIFFICULTY_LABELS[problem.difficulty] ?? problem.difficulty}`);
  }
  return tags;
}

export function normalizeLuoguUserId(input: string) {
  const value = input.trim();
  const matched = value.match(LUOGU_USER_ID_PATTERN);
  return matched?.[1] ?? value;
}

export function parseLuoguPractice(payload: LuoguPracticePayload, fetchedAt = new Date().toISOString()) {
  if (payload.status && payload.status >= 400) {
    throw new Error(payload.currentData?.errorMessage || `洛谷公开记录 HTTP ${payload.status}`);
  }
  if (payload.code && payload.code >= 400) {
    throw new Error(payload.currentData?.errorMessage || `洛谷公开记录 HTTP ${payload.code}`);
  }

  const data = payload.data;
  if (!data) {
    throw new Error('洛谷公开练习记录格式异常');
  }
  if (data.privacy) {
    throw new Error('该洛谷用户开启了练习记录隐私保护，无法公开同步');
  }

  const passed = data.passed ?? [];
  const submitted = data.submitted ?? [];
  const passedKeys = new Set(passed.map((problem) => problem.pid));
  const attemptedOnly = submitted.filter((problem) => !passedKeys.has(problem.pid));

  const submissions: OjSubmission[] = [
    ...passed.map((problem) => ({
      id: `${LUOGU_PLATFORM}:passed:${problem.pid}`,
      platform: LUOGU_PLATFORM,
      problemKey: problem.pid,
      problemName: `${problem.pid} - ${problem.name ?? '洛谷题目'}`,
      verdict: 'AC',
      accepted: true,
      tags: luoguProblemTags(problem, 'passed'),
      rating: problem.difficulty,
      submittedAt: fetchedAt,
      sourceUrl: luoguProblemUrl(problem.pid),
    })),
    ...attemptedOnly.map((problem) => ({
      id: `${LUOGU_PLATFORM}:submitted:${problem.pid}`,
      platform: LUOGU_PLATFORM,
      problemKey: problem.pid,
      problemName: `${problem.pid} - ${problem.name ?? '洛谷题目'}`,
      verdict: 'TRIED',
      accepted: false,
      tags: luoguProblemTags(problem, 'submitted'),
      rating: problem.difficulty,
      submittedAt: fetchedAt,
      sourceUrl: luoguProblemUrl(problem.pid),
    })),
  ];

  const contests: ContestRecord[] = (data.elo ?? []).map((record) => ({
    id: `${LUOGU_PLATFORM}:elo:${record.contest?.id ?? record.time}`,
    platform: LUOGU_PLATFORM,
    contestName: record.contest?.name ?? '洛谷比赛',
    ratingChange: record.prevDiff,
    newRating: record.rating,
    participatedAt: toIsoDate(record.contest?.endTime ?? record.time, fetchedAt),
    sourceUrl: record.contest?.id
      ? `https://www.luogu.com.cn/contest/${record.contest.id}`
      : 'https://www.luogu.com.cn/contest/list',
  }));

  return { submissions, contests };
}
