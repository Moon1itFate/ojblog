import { normalizeLuoguUserId, parseLuoguPractice } from './luogu';
import { normalizeNowCoderUserId, parseNowCoderAcmPracticeSubmissions, parseNowCoderSubmissions } from './nowcoder';
import type {
  ContestRecord,
  OjPlatform,
  OjSubmission,
  TrackerAccounts,
  TrackerProviderDefinition,
  TrackerSnapshot,
  TrackerSourceStatus,
} from './types';

const CODEFORCES_API = 'https://codeforces.com/api';
const ATCODER_PROBLEMS_API = 'https://kenkoooo.com/atcoder/atcoder-api';
const REQUEST_TIMEOUT_MS = 15_000;
const luoguPracticeRequests = new Map<string, Promise<LuoguPracticeResponse>>();
const NOWCODER_PUBLIC_ORIGINS = ['https://api-cdn.nowcoder.com', 'https://www.nowcoder.com'];
const NOWCODER_ACM_ORIGIN = 'https://ac.nowcoder.com';
const NOWCODER_ACM_PAGE_SIZE = 50;
const NOWCODER_ACM_MAX_PAGES = 50;

export interface TrackerProvider extends TrackerProviderDefinition {
  fetchSubmissions?: (handle: string) => Promise<OjSubmission[]>;
  fetchContests?: (handle: string) => Promise<ContestRecord[]>;
}

interface CodeforcesResponse<T> {
  status: 'OK' | 'FAILED';
  comment?: string;
  result: T;
}

interface CodeforcesSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  programmingLanguage?: string;
  verdict?: string;
  problem: {
    contestId?: number;
    index: string;
    name: string;
    rating?: number;
    tags?: string[];
  };
}

interface CodeforcesRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

interface AtCoderSubmission {
  id: number;
  epoch_second: number;
  problem_id: string;
  contest_id: string;
  user_id: string;
  language?: string;
  result: string;
}

interface AtCoderContestHistory {
  IsRated: boolean;
  Place: number;
  OldRating: number;
  NewRating: number;
  Performance: number;
  ContestScreenName: string;
  ContestName: string;
  ContestNameEn?: string;
  EndTime: string;
}

interface LuoguPracticeResponse {
  submissions: OjSubmission[];
  contests: ContestRecord[];
}

function createTimeoutSignal() {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => globalThis.clearTimeout(timeout) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const timeout = createTimeoutSignal();
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    timeout.clear();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function assertCodeforcesOk<T>(payload: CodeforcesResponse<T>) {
  if (payload.status !== 'OK') {
    throw new Error(payload.comment || 'Codeforces API returned FAILED');
  }
  return payload.result;
}

function toIsoDate(seconds: number) {
  return new Date(seconds * 1000).toISOString();
}

function codeforcesProblemKey(submission: CodeforcesSubmission) {
  const contestId = submission.problem.contestId ?? submission.contestId ?? 'unknown';
  return `${contestId}${submission.problem.index}`;
}

function codeforcesProblemUrl(submission: CodeforcesSubmission) {
  const contestId = submission.problem.contestId ?? submission.contestId;
  if (!contestId) return 'https://codeforces.com/problemset';
  return `https://codeforces.com/problemset/problem/${contestId}/${submission.problem.index}`;
}

export async function fetchCodeforcesSubmissions(handle: string, count = 500): Promise<OjSubmission[]> {
  const url = `${CODEFORCES_API}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=${count}`;
  const payload = await fetchJson<CodeforcesResponse<CodeforcesSubmission[]>>(url);
  const submissions = assertCodeforcesOk(payload);

  return submissions.map((submission) => {
    const problemKey = codeforcesProblemKey(submission);
    return {
      id: `codeforces:${submission.id}`,
      platform: 'codeforces',
      problemKey,
      problemName: `${problemKey} - ${submission.problem.name}`,
      contestId: String(submission.problem.contestId ?? submission.contestId ?? ''),
      verdict: submission.verdict || 'TESTING',
      accepted: submission.verdict === 'OK',
      tags: submission.problem.tags ?? [],
      rating: submission.problem.rating,
      language: submission.programmingLanguage,
      submittedAt: toIsoDate(submission.creationTimeSeconds),
      sourceUrl: codeforcesProblemUrl(submission),
    } satisfies OjSubmission;
  });
}

export async function fetchCodeforcesContests(handle: string): Promise<ContestRecord[]> {
  const url = `${CODEFORCES_API}/user.rating?handle=${encodeURIComponent(handle)}`;
  const payload = await fetchJson<CodeforcesResponse<CodeforcesRatingChange[]>>(url);
  const records = assertCodeforcesOk(payload);

  return records
    .slice(-30)
    .reverse()
    .map((record) => ({
      id: `codeforces:${record.contestId}:${record.ratingUpdateTimeSeconds}`,
      platform: 'codeforces',
      contestName: record.contestName,
      rank: record.rank,
      ratingChange: record.newRating - record.oldRating,
      oldRating: record.oldRating,
      newRating: record.newRating,
      participatedAt: toIsoDate(record.ratingUpdateTimeSeconds),
      sourceUrl: `https://codeforces.com/contest/${record.contestId}`,
    }));
}

export async function fetchAtCoderSubmissions(handle: string, count = 500): Promise<OjSubmission[]> {
  const url = `${ATCODER_PROBLEMS_API}/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`;
  const submissions = await fetchJson<AtCoderSubmission[]>(url);

  return submissions
    .sort((a, b) => b.epoch_second - a.epoch_second)
    .slice(0, count)
    .map((submission) => ({
      id: `atcoder:${submission.id}`,
      platform: 'atcoder',
      problemKey: submission.problem_id,
      problemName: submission.problem_id,
      contestId: submission.contest_id,
      verdict: submission.result,
      accepted: submission.result === 'AC',
      tags: ['AtCoder / 待标注'],
      language: submission.language,
      submittedAt: toIsoDate(submission.epoch_second),
      sourceUrl: `https://atcoder.jp/contests/${submission.contest_id}/submissions/${submission.id}`,
    }));
}

export async function fetchAtCoderContests(handle: string): Promise<ContestRecord[]> {
  const url = `https://atcoder.jp/users/${encodeURIComponent(handle)}/history/json`;
  const records = await fetchJson<AtCoderContestHistory[]>(url);

  return records
    .slice(-30)
    .reverse()
    .map((record) => ({
      id: `atcoder:${record.ContestScreenName}:${record.EndTime}`,
      platform: 'atcoder',
      contestName: record.ContestNameEn || record.ContestName,
      rank: record.Place,
      ratingChange: record.IsRated ? record.NewRating - record.OldRating : undefined,
      oldRating: record.IsRated ? record.OldRating : undefined,
      newRating: record.IsRated ? record.NewRating : undefined,
      participatedAt: new Date(record.EndTime).toISOString(),
      sourceUrl: `https://atcoder.jp/contests/${record.ContestScreenName.replace('.contest.atcoder.jp', '')}`,
    }));
}

export async function fetchNowCoderSubmissions(userId: string): Promise<OjSubmission[]> {
  const normalizedUserId = normalizeNowCoderUserId(userId);
  const url = `/api/tracker/nowcoder/${encodeURIComponent(normalizedUserId)}/tests`;
  const payload = await fetchJson<{ submissions: OjSubmission[] }>(url);
  return payload.submissions;
}

function getNowCoderAcmTotalPages(html: string) {
  const total = Number.parseInt(html.match(/<ul\b[^>]*data-total=["'](\d+)["']/i)?.[1] ?? '1', 10);
  if (!Number.isFinite(total) || total < 1) return 1;
  return Math.min(total, NOWCODER_ACM_MAX_PAGES);
}

function buildNowCoderAcmPracticeUrl(normalizedUserId: string, page: number, attempt: number) {
  const params = new URLSearchParams({
    pageSize: String(NOWCODER_ACM_PAGE_SIZE),
    search: '',
    statusTypeFilter: '-1',
    languageCategoryFilter: '-1',
    orderType: 'DESC',
    page: String(page),
    __ojblog: `${Date.now()}-${attempt}`,
  });
  return `${NOWCODER_ACM_ORIGIN}/acm/contest/profile/${encodeURIComponent(
    normalizedUserId,
  )}/practice-coding?${params.toString()}`;
}

async function fetchNowCoderAcmPracticePage(normalizedUserId: string, page: number): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const url = buildNowCoderAcmPracticeUrl(normalizedUserId, page, attempt);
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: `${NOWCODER_ACM_ORIGIN}/acm/contest/profile/${encodeURIComponent(normalizedUserId)}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      lastError = new Error(`牛客 ACM 公开练习页第 ${page} 页 HTTP ${response.status}`);
      continue;
    }

    try {
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(350);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('牛客 ACM 数据同步失败');
}

async function fetchNowCoderAcmPracticeSubmissions(normalizedUserId: string): Promise<OjSubmission[]> {
  const firstPageHtml = await fetchNowCoderAcmPracticePage(normalizedUserId, 1);
  const totalPages = getNowCoderAcmTotalPages(firstPageHtml);
  const pages = [firstPageHtml];

  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await fetchNowCoderAcmPracticePage(normalizedUserId, page));
  }

  const submissions = pages.flatMap((html) => parseNowCoderAcmPracticeSubmissions(html, normalizedUserId));
  return Array.from(new Map(submissions.map((submission) => [submission.id, submission])).values()).sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
  );
}

export async function fetchNowCoderSubmissionsFromPublicPage(userId: string): Promise<OjSubmission[]> {
  const normalizedUserId = normalizeNowCoderUserId(userId);
  let lastError: unknown;

  for (const origin of NOWCODER_PUBLIC_ORIGINS) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const url = `${origin}/users/${encodeURIComponent(normalizedUserId)}/tests?__ojblog=${Date.now()}-${attempt}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Referer: `https://www.nowcoder.com/users/${encodeURIComponent(normalizedUserId)}/tests`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        lastError = new Error(`牛客公开页 HTTP ${response.status}`);
        continue;
      }

      try {
        return parseNowCoderSubmissions(await response.text(), normalizedUserId);
      } catch (error) {
        lastError = error;
        if (attempt < 5) await sleep(350);
      }
    }
  }

  try {
    return await fetchNowCoderAcmPracticeSubmissions(normalizedUserId);
  } catch (error) {
    lastError = error;
  }

  const reason = lastError instanceof Error ? lastError.message : '牛客数据同步失败';
  throw new Error(`${reason}。请确认填写的是牛客个人主页数字 ID，或牛客竞赛主页 /acm/contest/profile/{id}，且记录可公开访问。`);
}

export async function fetchLuoguPractice(userId: string): Promise<LuoguPracticeResponse> {
  const normalizedUserId = normalizeLuoguUserId(userId);
  const existingRequest = luoguPracticeRequests.get(normalizedUserId);
  if (existingRequest) return existingRequest;

  const url = `/api/tracker/luogu/${encodeURIComponent(normalizedUserId)}/practice`;
  const request = fetchJson<LuoguPracticeResponse>(url);
  luoguPracticeRequests.set(normalizedUserId, request);

  try {
    return await request;
  } finally {
    luoguPracticeRequests.delete(normalizedUserId);
  }
}

export async function fetchLuoguSubmissions(userId: string): Promise<OjSubmission[]> {
  const payload = await fetchLuoguPractice(userId);
  return payload.submissions;
}

export async function fetchLuoguContests(userId: string): Promise<ContestRecord[]> {
  const payload = await fetchLuoguPractice(userId);
  return payload.contests;
}

export async function fetchLuoguPracticeFromPublicPage(userId: string): Promise<LuoguPracticeResponse> {
  const normalizedUserId = normalizeLuoguUserId(userId);
  const fetchedAt = new Date().toISOString();
  const response = await fetch(`https://www.luogu.com.cn/user/${encodeURIComponent(normalizedUserId)}/practice`, {
    headers: {
      Accept: 'application/json',
      Referer: 'https://www.luogu.com.cn/',
      'User-Agent': 'ojblog/0.2 (+https://github.com/Moon1itFate/ojblog)',
      'x-lentille-request': 'content-only',
      'x-luogu-type': 'content-only',
    },
  });

  if (!response.ok) {
    throw new Error(`洛谷公开练习记录 HTTP ${response.status}`);
  }

  return parseLuoguPractice(await response.json(), fetchedAt);
}

export const trackerProviders: TrackerProvider[] = [
  {
    platform: 'codeforces',
    name: 'Codeforces',
    accountLabel: 'Codeforces Handle',
    accountPlaceholder: '例如 tourist',
    homepage: 'https://codeforces.com',
    supports: {
      submissions: true,
      contests: true,
    },
    fetchSubmissions: fetchCodeforcesSubmissions,
    fetchContests: fetchCodeforcesContests,
  },
  {
    platform: 'atcoder',
    name: 'AtCoder',
    accountLabel: 'AtCoder User ID',
    accountPlaceholder: '例如 chokudai',
    homepage: 'https://atcoder.jp',
    supports: {
      submissions: true,
      contests: true,
    },
    fetchSubmissions: fetchAtCoderSubmissions,
    fetchContests: fetchAtCoderContests,
  },
  {
    platform: 'nowcoder',
    name: '牛客',
    accountLabel: '牛客 User ID',
    accountPlaceholder: '例如 251475259 或 ac.nowcoder.com/acm/contest/profile/...',
    homepage: 'https://www.nowcoder.com',
    supports: {
      submissions: true,
      contests: false,
    },
    fetchSubmissions: fetchNowCoderSubmissions,
  },
  {
    platform: 'luogu',
    name: '洛谷',
    accountLabel: '洛谷 UID',
    accountPlaceholder: '例如 206953 或个人主页链接',
    homepage: 'https://www.luogu.com.cn',
    supports: {
      submissions: true,
      contests: true,
    },
    fetchSubmissions: fetchLuoguSubmissions,
    fetchContests: fetchLuoguContests,
  },
];

export function getTrackerProvider(platform: OjPlatform) {
  return trackerProviders.find((provider) => provider.platform === platform);
}

export function getTrackerProviderName(platform: OjPlatform) {
  return getTrackerProvider(platform)?.name ?? platform;
}

export function createEmptyTrackerAccounts(): TrackerAccounts {
  return Object.fromEntries(trackerProviders.map((provider) => [provider.platform, '']));
}

export function normalizeTrackerAccounts(accounts: TrackerAccounts): TrackerAccounts {
  return Object.fromEntries(
    trackerProviders
      .map((provider) => [provider.platform, accounts[provider.platform]?.trim()] as const)
      .filter(([, handle]) => Boolean(handle)),
  );
}

async function collectSource<T>(
  provider: TrackerProvider,
  kind: NonNullable<TrackerSourceStatus['kind']>,
  handle: string | undefined,
  fetcher: (handle: string) => Promise<T[]>,
): Promise<{ items: T[]; status: TrackerSourceStatus }> {
  const normalized = handle?.trim();
  if (!normalized) {
    return {
      items: [],
      status: {
        platform: provider.platform,
        sourceName: provider.name,
        kind,
        status: 'skipped',
        message: '未配置账号',
        count: 0,
      },
    };
  }

  try {
    const items = await fetcher(normalized);
    return {
      items,
      status: {
        platform: provider.platform,
        sourceName: provider.name,
        kind,
        handle: normalized,
        status: 'connected',
        message: kind === 'contests' ? `已同步 ${items.length} 场比赛` : '已同步公网数据',
        count: items.length,
      },
    };
  } catch (error) {
    return {
      items: [],
      status: {
        platform: provider.platform,
        sourceName: provider.name,
        kind,
        handle: normalized,
        status: 'error',
        message: error instanceof Error ? error.message : '同步失败',
        count: 0,
      },
    };
  }
}

export async function syncTrackerData(accounts: TrackerAccounts): Promise<TrackerSnapshot> {
  const normalizedAccounts = normalizeTrackerAccounts(accounts);
  const sourceTasks = trackerProviders.flatMap((provider) => {
    const handle = normalizedAccounts[provider.platform];
    return [
      provider.fetchSubmissions
        ? collectSource(provider, 'submissions', handle, provider.fetchSubmissions)
        : Promise.resolve<{ items: OjSubmission[]; status: TrackerSourceStatus } | null>(null),
      provider.fetchContests
        ? collectSource(provider, 'contests', handle, provider.fetchContests)
        : Promise.resolve<{ items: ContestRecord[]; status: TrackerSourceStatus } | null>(null),
    ];
  });

  const sourceResults = (await Promise.all(sourceTasks)).filter((result): result is NonNullable<typeof result> =>
    Boolean(result),
  );
  const submissionResults = sourceResults.filter(
    (result): result is { items: OjSubmission[]; status: TrackerSourceStatus } => result.status.kind === 'submissions',
  );
  const contestResults = sourceResults.filter(
    (result): result is { items: ContestRecord[]; status: TrackerSourceStatus } => result.status.kind === 'contests',
  );

  return {
    fetchedAt: new Date().toISOString(),
    accounts: normalizedAccounts,
    submissions: submissionResults
      .flatMap((result) => result.items)
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    contests: contestResults
      .flatMap((result) => result.items)
      .sort((a, b) => Date.parse(b.participatedAt) - Date.parse(a.participatedAt)),
    sources: sourceResults.map((result) => result.status),
  };
}
