export type OjPlatform = "Codeforces" | "LeetCode" | "AtCoder" | "LuoGu";

export type SubmissionVerdict = "accepted" | "wrong-answer" | "time-limit" | "runtime-error";

export type ProblemStatus = "solved" | "reviewing" | "stuck";

export interface Profile {
  name: string;
  handle: string;
  headline: string;
  bio: string;
  githubUrl: string;
  email: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: "算法题解" | "学习笔记" | "项目日志" | "周复盘";
  tags: string[];
  publishedAt: string;
  readingTime: string;
  featured?: boolean;
}

export interface OjAccount {
  platform: OjPlatform;
  handle: string;
  solvedCount: number;
  submissionCount: number;
  lastSyncedAt: string;
  health: "synced" | "stale" | "manual";
}

export interface ProblemRecord {
  id: string;
  platform: OjPlatform;
  title: string;
  url: string;
  difficulty: string;
  tags: string[];
  status: ProblemStatus;
  verdict: SubmissionVerdict;
  solvedAt: string;
  note: string;
}

export interface TopicProfile {
  topic: string;
  solved: number;
  failedAttempts: number;
  confidence: number;
  recentSignal: "improving" | "flat" | "dropping";
}

export interface Recommendation {
  id: string;
  platform: OjPlatform;
  title: string;
  difficulty: string;
  tags: string[];
  reason: string;
  sourceQuality: "classic" | "editorial-rich" | "contest-core";
}

export interface AiDigest {
  title: string;
  generatedAt: string;
  summary: string;
  strengths: string[];
  weakSignals: string[];
  nextActions: string[];
}

export const profile: Profile = {
  name: "Moon1itFate",
  handle: "moonlit.dev",
  headline: "写代码、刷题，也把踩过的坑认真留下来。",
  bio: "这里会记录我的算法训练、项目开发、工程笔记和阶段复盘。OJ 追踪只是博客里的一个小功能，但它会把刷题记录、题解、AI 复盘和下一步训练计划串起来。",
  githubUrl: "https://github.com/Moon1itFate",
  email: "moonlit@example.com",
};

export const blogPosts: BlogPost[] = [
  {
    id: "post-interval-dp",
    title: "区间 DP：从最后一步反推状态",
    excerpt: "用 Burst Balloons 和石子合并复盘区间 DP 的状态定义，重点记录为什么要枚举最后一次操作。",
    category: "算法题解",
    tags: ["dp", "interval", "review"],
    publishedAt: "2026-05-30",
    readingTime: "8 min",
    featured: true,
  },
  {
    id: "post-ojblog-mvp",
    title: "ojblog 项目日志：先做博客，再做刷题模板",
    excerpt: "把刷题追踪从主产品降级为博客模块，先验证个人站的信息架构，再抽出可复用包。",
    category: "项目日志",
    tags: ["react", "typescript", "product"],
    publishedAt: "2026-05-29",
    readingTime: "5 min",
  },
  {
    id: "post-scc-dag",
    title: "Tarjan 缩点后，为什么 DAG DP 会变简单",
    excerpt: "从洛谷 P3387 复盘 SCC 缩点、拓扑序和最大权路径的组合套路。",
    category: "算法题解",
    tags: ["graph", "tarjan", "dag-dp"],
    publishedAt: "2026-05-27",
    readingTime: "7 min",
  },
  {
    id: "post-weekly-review",
    title: "本周复盘：计数题需要先写暴力校验",
    excerpt: "总结最近 WA 集中的几类题，给每个薄弱点安排下一组训练题。",
    category: "周复盘",
    tags: ["review", "combinatorics", "training"],
    publishedAt: "2026-05-26",
    readingTime: "6 min",
  },
];

export const accounts: OjAccount[] = [
  {
    platform: "Codeforces",
    handle: "Moon1itFate",
    solvedCount: 142,
    submissionCount: 397,
    lastSyncedAt: "2026-05-30 14:10",
    health: "synced",
  },
  {
    platform: "LeetCode",
    handle: "moonlit-fate",
    solvedCount: 219,
    submissionCount: 514,
    lastSyncedAt: "2026-05-30 13:42",
    health: "synced",
  },
  {
    platform: "AtCoder",
    handle: "Moon1it",
    solvedCount: 48,
    submissionCount: 91,
    lastSyncedAt: "2026-05-28 22:01",
    health: "stale",
  },
  {
    platform: "LuoGu",
    handle: "Moon1itFate",
    solvedCount: 76,
    submissionCount: 133,
    lastSyncedAt: "手动导入",
    health: "manual",
  },
];

export const records: ProblemRecord[] = [
  {
    id: "cf-1985h1",
    platform: "Codeforces",
    title: "Maximize the Largest Component",
    url: "https://codeforces.com/problemset/problem/1985/H1",
    difficulty: "1600",
    tags: ["dfs", "grid", "dsu"],
    status: "reviewing",
    verdict: "accepted",
    solvedAt: "2026-05-29",
    note: "连通块预处理是关键，二次扫描时要注意去重。",
  },
  {
    id: "lc-312",
    platform: "LeetCode",
    title: "Burst Balloons",
    url: "https://leetcode.com/problems/burst-balloons/",
    difficulty: "Hard",
    tags: ["dp", "interval"],
    status: "stuck",
    verdict: "wrong-answer",
    solvedAt: "2026-05-27",
    note: "状态定义反了，最后戳破而不是最先戳破。",
  },
  {
    id: "abc-362-e",
    platform: "AtCoder",
    title: "Count Arithmetic Subsequences",
    url: "https://atcoder.jp/contests/abc362/tasks/abc362_e",
    difficulty: "E",
    tags: ["dp", "combinatorics"],
    status: "solved",
    verdict: "accepted",
    solvedAt: "2026-05-25",
    note: "按末尾和公差转移，计数维度需要单独保留长度。",
  },
  {
    id: "lg-p3387",
    platform: "LuoGu",
    title: "缩点",
    url: "https://www.luogu.com.cn/problem/P3387",
    difficulty: "普及+/提高",
    tags: ["graph", "tarjan", "dag-dp"],
    status: "reviewing",
    verdict: "accepted",
    solvedAt: "2026-05-23",
    note: "SCC 缩点后变 DAG，再做拓扑 DP。",
  },
];

export const topics: TopicProfile[] = [
  { topic: "区间 DP", solved: 8, failedAttempts: 19, confidence: 42, recentSignal: "dropping" },
  { topic: "图论 SCC", solved: 14, failedAttempts: 7, confidence: 68, recentSignal: "improving" },
  { topic: "网格连通性", solved: 11, failedAttempts: 10, confidence: 57, recentSignal: "flat" },
  { topic: "组合计数", solved: 6, failedAttempts: 13, confidence: 39, recentSignal: "dropping" },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec-1",
    platform: "Codeforces",
    title: "Yet Another Counting Problem",
    difficulty: "1500",
    tags: ["math", "periodicity"],
    reason: "近期计数题错误集中在周期性观察，难度贴近当前区间。",
    sourceQuality: "editorial-rich",
  },
  {
    id: "rec-2",
    platform: "AtCoder",
    title: "Deque",
    difficulty: "DP E",
    tags: ["dp", "game"],
    reason: "适合巩固从状态定义到转移顺序的闭环。",
    sourceQuality: "classic",
  },
  {
    id: "rec-3",
    platform: "LuoGu",
    title: "P1880 石子合并",
    difficulty: "提高",
    tags: ["interval-dp"],
    reason: "和最近卡住的气球问题同属区间 DP，可用中文题面复盘。",
    sourceQuality: "contest-core",
  },
];

export const aiDigest: AiDigest = {
  title: "最近 7 天复盘",
  generatedAt: "2026-05-30 14:18",
  summary:
    "题目覆盖面不错，但错误集中在把题意转成状态定义的第一步。图论模板掌握较稳定，动态规划类题目需要增加“为什么这样定义状态”的记录。",
  strengths: ["SCC / DAG DP 复用稳定", "网格题能主动做连通块预处理", "Hard 题复盘记录质量提升"],
  weakSignals: ["区间 DP 状态边界反复写错", "组合计数缺少小样例验证", "Codeforces 1500-1700 题段耗时波动大"],
  nextActions: ["补 3 道区间 DP 经典题", "每道计数题记录一个暴力校验思路", "把 WA 样例沉淀到题解博客"],
};
