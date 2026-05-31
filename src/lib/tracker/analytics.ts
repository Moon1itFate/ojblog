import type {
  ActivityDay,
  DailyChallenge,
  OjSubmission,
  SkillProfile,
  TrackerAnalytics,
  TrackerSnapshot,
  WeakSpot,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DAYS = 365;

const fallbackChallenge: DailyChallenge = {
  title: 'AtCoder DP Contest A - Frog 1',
  sourceName: 'AtCoder',
  url: 'https://atcoder.jp/contests/dp/tasks/dp_a',
  targetTag: '入门动态规划',
  difficulty: 'warm-up',
  reason: '先同步真实账号，系统会根据错题标签替换成更贴近你的每日一题。',
  submitHint: '打开原题后在原 OJ 提交；同步模块会在下一次刷新时拉回结果。',
};

const challengeBank: Record<string, DailyChallenge[]> = {
  dp: [
    {
      title: 'AtCoder DP Contest N - Slimes',
      sourceName: 'AtCoder',
      url: 'https://atcoder.jp/contests/dp/tasks/dp_n',
      targetTag: 'dp',
      difficulty: 'interval dp',
      reason: '区间状态转移和合并代价很适合检验 DP 建模稳定性。',
      submitHint: '点击打开原题，在 AtCoder 提交后回到博客同步记录。',
    },
    {
      title: 'Codeforces 607B - Zuma',
      sourceName: 'Codeforces',
      url: 'https://codeforces.com/problemset/problem/607/B',
      targetTag: 'dp',
      difficulty: '1600',
      reason: '如果区间 DP 容易漏边界，这题能集中暴露问题。',
      submitHint: '点击打开原题，在 Codeforces 提交后回到博客同步记录。',
    },
  ],
  graphs: [
    {
      title: 'Codeforces 20C - Dijkstra?',
      sourceName: 'Codeforces',
      url: 'https://codeforces.com/problemset/problem/20/C',
      targetTag: 'graphs',
      difficulty: '1900',
      reason: '适合复习最短路、路径恢复和大图实现细节。',
      submitHint: '点击打开原题，在 Codeforces 提交后回到博客同步记录。',
    },
    {
      title: 'AtCoder ABC 317 C - Remembering the Days',
      sourceName: 'AtCoder',
      url: 'https://atcoder.jp/contests/abc317/tasks/abc317_c',
      targetTag: 'graphs',
      difficulty: 'abc-c',
      reason: '用较小数据范围训练搜索图上路径，适合补图论手感。',
      submitHint: '点击打开原题，在 AtCoder 提交后回到博客同步记录。',
    },
  ],
  math: [
    {
      title: 'AtCoder ABC 280 D - Factorial and Multiple',
      sourceName: 'AtCoder',
      url: 'https://atcoder.jp/contests/abc280/tasks/abc280_d',
      targetTag: 'math',
      difficulty: 'abc-d',
      reason: '能训练质因数分解、阶乘指数和二分判断。',
      submitHint: '点击打开原题，在 AtCoder 提交后回到博客同步记录。',
    },
    {
      title: 'Codeforces 478D - Red-Green Towers',
      sourceName: 'Codeforces',
      url: 'https://codeforces.com/problemset/problem/478/D',
      targetTag: 'math',
      difficulty: '1800',
      reason: '组合计数和 DP 交叉，适合作为数学薄弱项的进阶题。',
      submitHint: '点击打开原题，在 Codeforces 提交后回到博客同步记录。',
    },
  ],
  greedy: [
    {
      title: 'Codeforces 1409D - Decrease the Sum of Digits',
      sourceName: 'Codeforces',
      url: 'https://codeforces.com/problemset/problem/1409/D',
      targetTag: 'greedy',
      difficulty: '1400',
      reason: '训练构造式贪心和数字处理边界。',
      submitHint: '点击打开原题，在 Codeforces 提交后回到博客同步记录。',
    },
    {
      title: 'AtCoder ABC 376 E - Max x Sum',
      sourceName: 'AtCoder',
      url: 'https://atcoder.jp/contests/abc376/tasks/abc376_e',
      targetTag: 'greedy',
      difficulty: 'abc-e',
      reason: '适合训练排序、堆维护和贪心选择。',
      submitHint: '点击打开原题，在 AtCoder 提交后回到博客同步记录。',
    },
  ],
  'NowCoder ACM / practice': [
    {
      title: '牛客竞赛题库 - 今日弱项练习',
      sourceName: 'NowCoder',
      url: 'https://ac.nowcoder.com/acm/problem/list',
      targetTag: 'NowCoder ACM / practice',
      difficulty: '按近期错题自选',
      reason: '你最近的牛客 ACM 练习记录里仍有非 AC 提交，适合继续在牛客题库补同类题。',
      submitHint: '打开牛客题库提交；博客同步会把公开提交记录拉回日历和总结。',
    },
  ],
};

const recommendationBank: Record<string, string[]> = Object.fromEntries(
  Object.entries(challengeBank).map(([tag, challenges]) => [tag, challenges.map((challenge) => challenge.title)]),
);

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

function normalizeTag(tag: string) {
  return tag.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findChallenges(tag: string) {
  const direct = challengeBank[tag];
  if (direct) return direct;

  const normalized = normalizeTag(tag);
  return Object.entries(challengeBank).find(([key]) => normalizeTag(key) === normalized)?.[1] ?? [];
}

function buildDailyChallenge(weakSpots: WeakSpot[], solvedCount: number): DailyChallenge {
  const primaryWeakSpot = weakSpots[0];
  if (!primaryWeakSpot) return fallbackChallenge;

  const challenges = findChallenges(primaryWeakSpot.tag);
  const challenge = challenges[solvedCount % Math.max(challenges.length, 1)] ?? fallbackChallenge;
  return {
    ...challenge,
    targetTag: primaryWeakSpot.tag,
    reason: `${challenge.reason} 当前该标签非 AC ${primaryWeakSpot.wrongCount} 次，优先级 ${primaryWeakSpot.score}。`,
  };
}

function buildSkillProfile(summary: TrackerAnalytics['summary'], weakSpots: WeakSpot[]): SkillProfile {
  const acceptedRate = summary.totalSubmissions === 0 ? 0 : Math.round((summary.totalSolved / summary.totalSubmissions) * 100);
  const activityScore = Math.min(35, Math.round((summary.activeDays / 30) * 35));
  const solvedScore = Math.min(45, Math.round(Math.sqrt(summary.totalSolved) * 7));
  const upsolveScore = Math.min(20, summary.upsolvedProblems * 3);
  const score = Math.min(100, activityScore + solvedScore + upsolveScore);
  const level = score >= 80 ? '稳定进阶' : score >= 55 ? '基础成型' : score >= 30 ? '建立题感中' : '刚开始积累';
  const topWeakSpot = weakSpots[0];

  return {
    score,
    level,
    summary:
      summary.totalSubmissions > 0
        ? `当前共同步 ${summary.totalSubmissions} 次提交，覆盖 ${summary.activeDays} 个活跃日，AC 题目约 ${summary.totalSolved} 道，估算 AC 覆盖率 ${acceptedRate}%。`
        : '同步账号后，这里会根据真实提交记录生成水平画像。',
    strengths: [
      summary.activeDays >= 7 ? '已经形成连续刷题记录，可以做周期复盘。' : '适合先建立固定刷题节奏。',
      summary.upsolvedProblems > 0 ? `已有 ${summary.upsolvedProblems} 道题从错误推进到 AC。` : '补题闭环还可以继续加强。',
    ],
    gaps: topWeakSpot
      ? [`${topWeakSpot.tag} 是当前最高优先级薄弱项。`, `该方向非 AC ${topWeakSpot.wrongCount} 次，建议先复盘错误原因。`]
      : ['暂时没有足够错题标签，先继续同步更多提交。'],
    nextActions: topWeakSpot
      ? ['先复盘最近 3 次非 AC 记录。', `今天优先补一题 ${topWeakSpot.tag}。`, '提交后重新同步，观察日历和弱项分数变化。']
      : ['同步至少一个 OJ 账号。', '完成一题并提交到原 OJ。', '回到博客刷新同步，生成下一轮分析。'],
  };
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
        action: stats.solved > 0 ? '保留错因并做同标签补题。' : '先补一题低难度题建立正反馈。',
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

  const summary = {
    totalSolved: solvedProblems.size,
    totalSubmissions: snapshot.submissions.length,
    wrongProblems: wrongProblems.size,
    upsolvedProblems: upsolvedProblems.size,
    activeDays,
    lastAcceptedAt: recentAccepted?.submittedAt,
  };

  const recommendedProblems = weakSpots
    .flatMap((spot) => recommendationBank[spot.tag] ?? recommendationBank[normalizeTag(spot.tag)] ?? [])
    .slice(0, 6);

  return {
    summary,
    activityDays,
    weakSpots,
    skillProfile: buildSkillProfile(summary, weakSpots),
    dailyChallenge: buildDailyChallenge(weakSpots, solvedProblems.size),
    recentSubmissions: snapshot.submissions.slice(0, 12),
    recommendedProblems:
      recommendedProblems.length > 0
        ? recommendedProblems
        : ['同步账号后会根据真实错题标签生成补题池', '下一阶段可接入大模型生成个性化训练单'],
  };
}
