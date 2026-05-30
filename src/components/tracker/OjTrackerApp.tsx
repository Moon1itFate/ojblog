import { useEffect, useMemo, useState } from 'react';
import {
  RiCalendarCheckLine,
  RiCheckDoubleLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiRefreshLine,
  RiRobot2Line,
  RiSignalTowerLine,
  RiTimerFlashLine,
} from 'react-icons/ri';
import { buildTrackerAnalytics } from '@/lib/tracker/analytics';
import { syncTrackerData } from '@/lib/tracker/providers';
import type {
  ContestRecord,
  OjSubmission,
  TrackerAccounts,
  TrackerAnalytics,
  TrackerSnapshot,
  TrackerSourceStatus,
} from '@/lib/tracker/types';

const ACCOUNT_STORAGE_KEY = 'ojblog:tracker:accounts';
const SNAPSHOT_STORAGE_KEY = 'ojblog:tracker:snapshot';
const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

const emptyAccounts: TrackerAccounts = {
  codeforces: '',
  atcoder: '',
};

function formatDate(value?: string) {
  if (!value) return '暂无';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function platformName(platform: string) {
  return platform === 'codeforces' ? 'Codeforces' : 'AtCoder';
}

function sourceClass(status: TrackerSourceStatus['status']) {
  if (status === 'connected') return 'source-chip connected';
  if (status === 'error') return 'source-chip error';
  return 'source-chip skipped';
}

function loadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be disabled in privacy modes; the live UI can still work without persistence.
  }
}

function removeStoredJson(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures; they should never break rendering.
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTrackerAccounts(value: unknown): value is TrackerAccounts {
  if (!isObject(value)) return false;
  const { codeforces, atcoder } = value;
  return (
    (codeforces === undefined || typeof codeforces === 'string') &&
    (atcoder === undefined || typeof atcoder === 'string')
  );
}

function isTrackerSnapshot(value: unknown): value is TrackerSnapshot {
  if (!isObject(value)) return false;
  if (typeof value.fetchedAt !== 'string') return false;
  if (!isTrackerAccounts(value.accounts)) return false;
  if (!Array.isArray(value.submissions)) return false;
  if (!Array.isArray(value.contests)) return false;
  if (!Array.isArray(value.sources)) return false;
  return !Number.isNaN(Date.parse(value.fetchedAt));
}

function safeBuildTrackerAnalytics(snapshot: TrackerSnapshot | null): TrackerAnalytics | null {
  if (!snapshot) return null;
  try {
    return buildTrackerAnalytics(snapshot);
  } catch {
    return null;
  }
}

function normalizeAccounts(accounts: TrackerAccounts): TrackerAccounts {
  return {
    codeforces: accounts.codeforces?.trim() || undefined,
    atcoder: accounts.atcoder?.trim() || undefined,
  };
}

function hasAnyAccount(accounts: TrackerAccounts) {
  return Boolean(accounts.codeforces?.trim() || accounts.atcoder?.trim());
}

function SourceStatusList({ sources }: { sources: TrackerSourceStatus[] }) {
  return (
    <div className="source-list" aria-label="数据源状态">
      {sources.map((source, index) => (
        <span className={sourceClass(source.status)} key={`${source.platform}-${index}`}>
          <RiSignalTowerLine />
          {platformName(source.platform)}
          {source.handle ? ` / ${source.handle}` : ''}
          <em>{source.count}</em>
        </span>
      ))}
    </div>
  );
}

function ActivityCalendar({ days }: { days: ReturnType<typeof buildTrackerAnalytics>['activityDays'] }) {
  return (
    <>
      <div className="activity-calendar live" aria-label="真实刷题日历">
        {days.map((day) => (
          <span
            className={`activity-cell level-${day.level} ${day.wrong > 0 ? 'wrong' : ''}`}
            key={day.date}
            title={`${day.date}: AC ${day.solved}, 非 AC ${day.wrong}`}
          />
        ))}
      </div>
      <div className="legend">
        <span>少</span>
        <i className="level-1" />
        <i className="level-2" />
        <i className="level-3" />
        <i className="level-4" />
        <span>多</span>
      </div>
    </>
  );
}

function RecentSubmissionRow({ submission }: { submission: OjSubmission }) {
  return (
    <tr>
      <td>{platformName(submission.platform)}</td>
      <td>
        {submission.sourceUrl ? (
          <a href={submission.sourceUrl} target="_blank" rel="noreferrer">
            {submission.problemName}
            <RiExternalLinkLine />
          </a>
        ) : (
          submission.problemName
        )}
      </td>
      <td>
        <span className={submission.accepted ? 'status-pill accepted' : 'status-pill failed'}>{submission.verdict}</span>
      </td>
      <td>{submission.tags.slice(0, 2).join(' / ') || '未标注'}</td>
      <td>{formatDate(submission.submittedAt)}</td>
    </tr>
  );
}

function ContestItem({ contest }: { contest: ContestRecord }) {
  return (
    <article className="contest-item">
      <div>
        <p>{contest.contestName}</p>
        <span>{formatDate(contest.participatedAt)}</span>
      </div>
      <div>
        <strong>{contest.rank ? `Rank ${contest.rank}` : '已记录'}</strong>
        <small className={(contest.ratingChange ?? 0) >= 0 ? 'rating-up' : 'rating-down'}>
          {contest.ratingChange ? `${contest.ratingChange > 0 ? '+' : ''}${contest.ratingChange}` : 'rating -'}
        </small>
      </div>
    </article>
  );
}

export default function OjTrackerApp() {
  const [accounts, setAccounts] = useState<TrackerAccounts>(emptyAccounts);
  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analytics = useMemo(() => safeBuildTrackerAnalytics(snapshot), [snapshot]);

  useEffect(() => {
    const storedAccounts = loadJson<unknown>(ACCOUNT_STORAGE_KEY);
    const storedSnapshot = loadJson<unknown>(SNAPSHOT_STORAGE_KEY);
    const savedAccounts = isTrackerAccounts(storedAccounts) ? storedAccounts : null;
    const savedSnapshot = isTrackerSnapshot(storedSnapshot) ? storedSnapshot : null;

    if (storedAccounts && !savedAccounts) removeStoredJson(ACCOUNT_STORAGE_KEY);
    if (storedSnapshot && !savedSnapshot) removeStoredJson(SNAPSHOT_STORAGE_KEY);

    if (savedAccounts) setAccounts(savedAccounts);
    if (savedSnapshot) setSnapshot(savedSnapshot);

    const shouldAutoSync =
      savedAccounts &&
      hasAnyAccount(savedAccounts) &&
      (!savedSnapshot || Date.now() - Date.parse(savedSnapshot.fetchedAt) > AUTO_SYNC_INTERVAL_MS);

    if (shouldAutoSync) {
      void handleSync(savedAccounts);
    }
  }, []);

  async function handleSync(nextAccounts = accounts) {
    const normalized = normalizeAccounts(nextAccounts);
    if (!hasAnyAccount(normalized)) {
      setError('至少填写一个 OJ 账号后才能联网同步。');
      return;
    }

    setLoading(true);
    setError('');
    saveJson(ACCOUNT_STORAGE_KEY, normalized);
    setAccounts(normalized);

    try {
      const nextSnapshot = await syncTrackerData(normalized);
      if (!isTrackerSnapshot(nextSnapshot)) {
        throw new Error('同步结果格式异常，请稍后重试。');
      }
      setSnapshot(nextSnapshot);
      saveJson(SNAPSHOT_STORAGE_KEY, nextSnapshot);

      const connected = nextSnapshot.sources.some((source) => source.status === 'connected');
      if (!connected) {
        setError('暂时没有数据源同步成功，请检查账号名或目标平台 API 状态。');
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : '同步失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tracker-live">
      <section className="tracker-hero">
        <div>
          <p className="tracker-kicker">Online OJ Tracker</p>
          <h1>把公网 OJ 记录同步成自己的算法成长仪表盘</h1>
          <p>
            现在页面已经不是静态 MVP：填写账号后会从 Codeforces 官方 API 和 AtCoder Problems 公共接口拉取真实提交，
            自动生成刷题日历、错题标签、补题建议与比赛记录。下一阶段可以把这些快照写入云数据库，再交给大模型做长期分析。
          </p>
        </div>
        <div className="hero-metrics" aria-label="刷题概览">
          <div>
            <span>{analytics?.summary.totalSolved ?? 0}</span>
            <small>已 AC 题目</small>
          </div>
          <div>
            <span>{analytics?.summary.wrongProblems ?? 0}</span>
            <small>错题池</small>
          </div>
          <div>
            <span>{snapshot?.contests.length ?? 0}</span>
            <small>比赛记录</small>
          </div>
        </div>
      </section>

      <section className="tracker-panel sync-panel">
        <div className="panel-title">
          <RiDatabase2Line />
          <div>
            <h2>公网数据同步</h2>
            <p>账号保存在当前浏览器，点击同步会直接请求线上 OJ 数据源。</p>
          </div>
        </div>
        <div className="sync-controls">
          <label>
            <span>Codeforces Handle</span>
            <input
              value={accounts.codeforces ?? ''}
              placeholder="例如 tourist"
              onChange={(event) => setAccounts((current) => ({ ...current, codeforces: event.target.value }))}
            />
          </label>
          <label>
            <span>AtCoder User ID</span>
            <input
              value={accounts.atcoder ?? ''}
              placeholder="例如 chokudai"
              onChange={(event) => setAccounts((current) => ({ ...current, atcoder: event.target.value }))}
            />
          </label>
          <button type="button" onClick={() => void handleSync()} disabled={loading}>
            <RiRefreshLine className={loading ? 'spin' : ''} />
            {loading ? '同步中' : '同步'}
          </button>
        </div>
        {snapshot && (
          <div className="sync-foot">
            <span>上次同步：{formatDate(snapshot.fetchedAt)}</span>
            <SourceStatusList sources={snapshot.sources} />
          </div>
        )}
        {error && (
          <p className="tracker-error">
            <RiErrorWarningLine />
            {error}
          </p>
        )}
      </section>

      <section className="tracker-grid">
        <div className="tracker-panel activity-panel">
          <div className="panel-title">
            <RiCalendarCheckLine />
            <div>
              <h2>真实刷题日历</h2>
              <p>按最近 98 天提交记录统计，描边格子表示当天存在非 AC 提交。</p>
            </div>
          </div>
          {analytics ? (
            <ActivityCalendar days={analytics.activityDays} />
          ) : (
            <div className="empty-state">同步账号后，这里会变成真实 OJ 热力图。</div>
          )}
        </div>

        <div className="tracker-panel ai-panel">
          <div className="panel-title">
            <RiRobot2Line />
            <div>
              <h2>弱点分析</h2>
              <p>先用错题标签做规则分析，后续可接入大模型生成复盘文本。</p>
            </div>
          </div>
          <div className="weak-list">
            {analytics && analytics.weakSpots.length > 0 ? (
              analytics.weakSpots.map((item) => (
                <article key={item.tag}>
                  <div className="weak-head">
                    <span>{item.tag}</span>
                    <strong>{item.score}</strong>
                  </div>
                  <p>
                    非 AC {item.wrongCount} 次，AC {item.solvedCount} 次。{item.action}
                  </p>
                  <div className="weak-bar">
                    <i style={{ width: `${Math.max(12, item.score)}%` }} />
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">还没有足够错题数据，先同步或继续刷题。</div>
            )}
          </div>
        </div>
      </section>

      <section className="tracker-grid bottom-grid">
        <div className="tracker-panel records-panel">
          <div className="panel-title">
            <RiCheckDoubleLine />
            <div>
              <h2>最近提交</h2>
              <p>从公网 API 返回的提交记录，保留题目链接与判题状态。</p>
            </div>
          </div>
          {analytics && analytics.recentSubmissions.length > 0 ? (
            <div className="records-table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>平台</th>
                    <th>题目</th>
                    <th>状态</th>
                    <th>标签</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentSubmissions.map((submission) => (
                    <RecentSubmissionRow submission={submission} key={submission.id} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">暂无真实提交记录。</div>
          )}
        </div>

        <div className="tracker-panel contest-panel">
          <div className="panel-title">
            <RiTimerFlashLine />
            <div>
              <h2>比赛追踪</h2>
              <p>当前先接入 Codeforces rating contest，XCPC 行程源下一阶段接入。</p>
            </div>
          </div>
          <div className="contest-list">
            {snapshot && snapshot.contests.length > 0 ? (
              snapshot.contests.slice(0, 8).map((contest) => <ContestItem contest={contest} key={contest.id} />)
            ) : (
              <div className="empty-state">同步 Codeforces 后会展示近期比赛记录。</div>
            )}
          </div>
        </div>
      </section>

      <section className="tracker-panel roadmap-panel">
        <div className="panel-title">
          <RiSignalTowerLine />
          <div>
            <h2>下一步：云端化与 AI 化</h2>
            <p>当前已经能联网同步；要做到长期追踪，需要把同步快照写进云数据库。</p>
          </div>
        </div>
        <div className="roadmap">
          <article>
            <strong>1. 数据库</strong>
            <span>Supabase / Neon 存用户账号、提交记录、错题复盘、每日统计。</span>
          </article>
          <article>
            <strong>2. 定时同步</strong>
            <span>Vercel Cron / GitHub Actions 定时拉取各平台 API，避免只靠打开网页同步。</span>
          </article>
          <article>
            <strong>3. AI 复盘</strong>
            <span>把错题、标签、代码摘要交给模型，生成薄弱点总结和补题清单。</span>
          </article>
          <article>
            <strong>4. 比赛日程</strong>
            <span>接入 Codeforces contest.list、AtCoder contest 页面与 XCPC 信息源。</span>
          </article>
        </div>
        <div className="recommendations">
          <h3>补题池</h3>
          <ul>
            {(analytics?.recommendedProblems ?? ['同步真实账号后生成推荐']).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
