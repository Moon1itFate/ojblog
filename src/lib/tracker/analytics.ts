import type { ActivityDay, OjSubmission, TrackerAnalytics, TrackerSnapshot, WeakSpot } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DAYS = 98;

const recommendationBank: Record<string, string[]> = {
  dp: ['AtCoder DP Contest N - Slimes', 'Codeforces 607B - Zuma'],
  graphs: ['Codeforces 20C - Dijkstra?', 'AtCoder ABC 317 C - Remembering the Days'],
  math: ['Codeforces 478D - Red-Green Towers', 'AtCoder ABC 280 D - Factorial and Multiple'],
  greedy: ['Codeforces 1409D - Decrease the Sum of Digits', 'AtCoder ABC 376 E - Max × Sum'],
  'AtCoder / 待标注': ['先为 AtCoder 题目补充标签，再进入 AI 分析队列'],
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function problemUniqueKey(submission: OjSubmission) {
  return `${submission.platform}:${submission.problemKey}`;
}

function activityLevel(solved: number, wrong: number) {
  if (solved + wrong === 0) return 0;
  if (solved >= 5) return 4;
  if (solved >= 3 || wrong >= 4) return 3;
  if (solved >= 1 || wrong >= 2) return 2;
  return 1;
}

export function buildActivityDays(submissions: OjSubmission[]) {
  const today = new Date();
  const start = new Date(today.getTime() - (CALENDAR_DAYS - 1) * DAY_MS);
  const buckets = new Map<string, { solved: Set<string>; wrong: Set<string> }>();

  for (const submission of submissions) {
    const key = dayKey(new Date(submission.submittedAt));
    if (!buckets.has(key)) {
      buckets.set(key, { solved: new Set(), wrong: new Set() });
    }

    const bucket = buckets.get(key);
    if (!bucket) continue;
    const problemKey = problemUniqueKey(submission);
    if (submission.accepted) bucket.solved.add(problemKey);
    else bucket.wrong.add(problemKey);
  }

  return Array.from({ length: CALENDAR_DAYS }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    const key = dayKey(date);
    const bucket = buckets.get(key);
    const solved = bucket?.solved.size ?? 0;
    const wrong = bucket?.wrong.size ?? 0;
    return {
      date: key,
      solved,
      wrong,
      level: activityLevel(solved, wrong),
    } satisfies ActivityDay;
  });
}

export function buildWeakSpots(submissions: OjSubmission[]) {
  const tagStats = new Map<string, { solved: number; wrong: number }>();

  for (const submission of submissions) {
    const tags = submission.tags.length > 0 ? submission.tags : ['未标注'];
    for (const tag of tags) {
      const stats = tagStats.get(tag) ?? { solved: 0, wrong: 0 };
      if (submission.accepted) stats.solved += 1;
      else stats.wrong += 1;
      tagStats.set(tag, stats);
    }
  }

  return [...tagStats.entries()]
    .filter(([, stats]) => stats.wrong > 0)
    .map(([tag, stats]) => {
      const total = stats.solved + stats.wrong;
      const wrongRatio = total === 0 ? 0 : stats.wrong / total;
      const score = Math.min(99, Math.round(wrongRatio * 70 + Math.min(stats.wrong, 10) * 3));
      return {
        tag,
        wrongCount: stats.wrong,
        solvedCount: stats.solved,
        score,
        action: stats.solved > 0 ? '保留错因并做同标签补题' : '先补一题低难度建立正反馈',
      } satisfies WeakSpot;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function buildTrackerAnalytics(snapshot: TrackerSnapshot): TrackerAnalytics {
  const solvedProblems = new Set<string>();
  const wrongProblems = new Set<string>();
  const upsolvedProblems = new Set<string>();

  for (const submission of snapshot.submissions) {
    const key = problemUniqueKey(submission);
    if (submission.accepted) {
      solvedProblems.add(key);
      if (wrongProblems.has(key)) upsolvedProblems.add(key);
    } else {
      wrongProblems.add(key);
    }
  }

  const activityDays = buildActivityDays(snapshot.submissions);
  const weakSpots = buildWeakSpots(snapshot.submissions);
  const activeDays = activityDays.filter((day) => day.solved > 0 || day.wrong > 0).length;
  const recentAccepted = snapshot.submissions.find((submission) => submission.accepted);

  const recommendedProblems = weakSpots
    .flatMap((spot) => recommendationBank[spot.tag] ?? recommendationBank[spot.tag.toLowerCase()] ?? [])
    .slice(0, 6);

  return {
    summary: {
      totalSolved: solvedProblems.size,
      totalSubmissions: snapshot.submissions.length,
      wrongProblems: wrongProblems.size,
      upsolvedProblems: upsolvedProblems.size,
      activeDays,
      lastAcceptedAt: recentAccepted?.submittedAt,
    },
    activityDays,
    weakSpots,
    recentSubmissions: snapshot.submissions.slice(0, 12),
    recommendedProblems:
      recommendedProblems.length > 0
        ? recommendedProblems
        : ['同步账号后会根据真实错题标签生成补题池', '下一阶段可接入大模型生成个性化训练单'],
  };
}
