export type OjPlatform = string;

export type TrackerAccounts = Partial<Record<OjPlatform, string>>;

export interface TrackerProviderDefinition {
  platform: OjPlatform;
  name: string;
  accountLabel: string;
  accountPlaceholder: string;
  homepage: string;
  supports: {
    submissions: boolean;
    contests: boolean;
  };
}

export interface OjSubmission {
  id: string;
  platform: OjPlatform;
  problemKey: string;
  problemName: string;
  contestId?: string;
  verdict: string;
  accepted: boolean;
  tags: string[];
  rating?: number;
  language?: string;
  submittedAt: string;
  sourceUrl?: string;
}

export interface ContestRecord {
  id: string;
  platform: OjPlatform;
  contestName: string;
  rank?: number;
  ratingChange?: number;
  oldRating?: number;
  newRating?: number;
  participatedAt: string;
  sourceUrl?: string;
}

export interface TrackerSourceStatus {
  platform: OjPlatform;
  sourceName?: string;
  kind?: 'submissions' | 'contests';
  handle?: string;
  status: 'connected' | 'error' | 'skipped';
  message: string;
  count: number;
}

export interface TrackerSnapshot {
  fetchedAt: string;
  accounts: TrackerAccounts;
  submissions: OjSubmission[];
  contests: ContestRecord[];
  sources: TrackerSourceStatus[];
}

export interface ActivityDay {
  date: string;
  solved: number;
  wrong: number;
  level: number;
}

export interface WeakSpot {
  tag: string;
  wrongCount: number;
  solvedCount: number;
  score: number;
  action: string;
}

export interface TrackerSummary {
  totalSolved: number;
  totalSubmissions: number;
  wrongProblems: number;
  upsolvedProblems: number;
  activeDays: number;
  lastAcceptedAt?: string;
}

export interface SkillProfile {
  score: number;
  level: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  nextActions: string[];
}

export interface DailyChallenge {
  title: string;
  sourceName: string;
  url?: string;
  targetTag: string;
  difficulty: string;
  reason: string;
  submitHint: string;
}

export interface TrackerAnalytics {
  summary: TrackerSummary;
  activityDays: ActivityDay[];
  weakSpots: WeakSpot[];
  skillProfile: SkillProfile;
  dailyChallenge: DailyChallenge;
  recentSubmissions: OjSubmission[];
  recommendedProblems: string[];
}
