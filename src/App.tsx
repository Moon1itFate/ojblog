import {
  BarChart3,
  BookOpen,
  Brain,
  CircleCheck,
  Clock3,
  Compass,
  DatabaseZap,
  FileText,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  accounts,
  aiDigest,
  records,
  recommendations,
  topics,
  type OjAccount,
  type ProblemRecord,
  type Recommendation,
  type TopicProfile,
} from "./domain";

type TabKey = "overview" | "records" | "insights" | "recommendations" | "blog";

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "总览", icon: BarChart3 },
  { key: "records", label: "刷题记录", icon: DatabaseZap },
  { key: "insights", label: "AI 复盘", icon: Brain },
  { key: "recommendations", label: "薄弱题", icon: Target },
  { key: "blog", label: "题解博客", icon: BookOpen },
];

const statusText: Record<ProblemRecord["status"], string> = {
  solved: "已通过",
  reviewing: "待复盘",
  stuck: "卡住",
};

const healthText: Record<OjAccount["health"], string> = {
  synced: "已同步",
  stale: "待更新",
  manual: "手动",
};

const qualityText: Record<Recommendation["sourceQuality"], string> = {
  classic: "经典",
  "contest-core": "核心",
  "editorial-rich": "题解丰富",
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");

  const filteredRecords = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return records;

    return records.filter((record) => {
      const haystack = [record.platform, record.title, record.difficulty, ...record.tags, record.note]
        .join(" ")
        .toLowerCase();
      return haystack.includes(value);
    });
  }, [query]);

  const solvedTotal = accounts.reduce((sum, account) => sum + account.solvedCount, 0);
  const submissionTotal = accounts.reduce((sum, account) => sum + account.submissionCount, 0);
  const weakestTopic = [...topics].sort((a, b) => a.confidence - b.confidence)[0];

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-block">
          <div className="brand-mark">OJ</div>
          <div>
            <p className="eyebrow">ojblog</p>
            <h1>刷题知识库</h1>
          </div>
        </div>

        <nav className="nav-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "nav-item active" : "nav-item"}
                onClick={() => setActiveTab(tab.key)}
                type="button"
                title={tab.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sync-panel">
          <div className="sync-panel__icon">
            <RefreshCw size={18} aria-hidden="true" />
          </div>
          <div>
            <span>同步队列</span>
            <strong>4 个平台</strong>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Moon1itFate</p>
            <h2>{titleForTab(activeTab)}</h2>
          </div>
          <div className="topbar-actions">
            <label className="search-box" aria-label="搜索刷题记录">
              <Search size={17} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索平台、题目、标签"
              />
            </label>
            <button className="icon-button" type="button" title="设置">
              <Settings2 size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {activeTab === "overview" && (
          <Overview
            solvedTotal={solvedTotal}
            submissionTotal={submissionTotal}
            weakestTopic={weakestTopic}
          />
        )}
        {activeTab === "records" && <RecordsView records={filteredRecords} />}
        {activeTab === "insights" && <InsightsView />}
        {activeTab === "recommendations" && <RecommendationsView />}
        {activeTab === "blog" && <BlogView />}
      </section>
    </main>
  );
}

function Overview({
  solvedTotal,
  submissionTotal,
  weakestTopic,
}: {
  solvedTotal: number;
  submissionTotal: number;
  weakestTopic: TopicProfile;
}) {
  return (
    <div className="content-grid">
      <section className="metric-strip">
        <Metric icon={CircleCheck} label="AC 题数" value={solvedTotal.toString()} tone="green" />
        <Metric icon={Clock3} label="提交次数" value={submissionTotal.toString()} tone="blue" />
        <Metric icon={TrendingUp} label="本周复盘" value="11" tone="amber" />
        <Metric icon={Target} label="薄弱主题" value={weakestTopic.topic} tone="red" />
      </section>

      <section className="band two-columns">
        <div>
          <div className="section-heading">
            <h3>OJ 账号</h3>
            <button className="text-button" type="button">
              <RefreshCw size={16} aria-hidden="true" />
              同步
            </button>
          </div>
          <div className="account-list">
            {accounts.map((account) => (
              <AccountRow key={account.platform} account={account} />
            ))}
          </div>
        </div>

        <div>
          <div className="section-heading">
            <h3>题型画像</h3>
            <button className="text-button" type="button">
              <Sparkles size={16} aria-hidden="true" />
              生成
            </button>
          </div>
          <div className="topic-stack">
            {topics.map((topic) => (
              <TopicBar key={topic.topic} topic={topic} />
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="section-heading">
          <h3>最近记录</h3>
          <span className="muted">{records.length} 条</span>
        </div>
        <RecordTable records={records.slice(0, 4)} />
      </section>
    </div>
  );
}

function RecordsView({ records: visibleRecords }: { records: ProblemRecord[] }) {
  return (
    <section className="band">
      <div className="section-heading">
        <h3>刷题记录</h3>
        <div className="segmented-control" aria-label="状态筛选">
          <button type="button" className="active">全部</button>
          <button type="button">已通过</button>
          <button type="button">待复盘</button>
        </div>
      </div>
      <RecordTable records={visibleRecords} />
    </section>
  );
}

function InsightsView() {
  return (
    <div className="content-grid">
      <section className="band ai-panel">
        <div className="digest-header">
          <div>
            <p className="eyebrow">{aiDigest.generatedAt}</p>
            <h3>{aiDigest.title}</h3>
          </div>
          <button className="text-button primary" type="button">
            <Brain size={16} aria-hidden="true" />
            重新分析
          </button>
        </div>
        <p className="digest-summary">{aiDigest.summary}</p>
      </section>

      <section className="band three-columns">
        <DigestList title="优势" items={aiDigest.strengths} />
        <DigestList title="风险信号" items={aiDigest.weakSignals} />
        <DigestList title="下一步" items={aiDigest.nextActions} />
      </section>
    </div>
  );
}

function RecommendationsView() {
  return (
    <section className="recommendation-grid">
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </section>
  );
}

function BlogView() {
  return (
    <div className="content-grid">
      <section className="band editor-layout">
        <div>
          <div className="section-heading compact">
            <h3>题解草稿</h3>
            <span className="status-pill">3 篇待整理</span>
          </div>
          <div className="draft-list">
            {records.slice(0, 3).map((record) => (
              <article className="draft-item" key={record.id}>
                <span>{record.platform}</span>
                <strong>{record.title}</strong>
                <p>{record.note}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="editor-preview">
          <div className="preview-toolbar">
            <FileText size={17} aria-hidden="true" />
            <span>区间 DP：从最后一步反推状态</span>
          </div>
          <div className="markdown-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AccountRow({ account }: { account: OjAccount }) {
  return (
    <article className="account-row">
      <div>
        <strong>{account.platform}</strong>
        <span>{account.handle}</span>
      </div>
      <div className="account-stats">
        <span>{account.solvedCount} AC</span>
        <span className={`health health-${account.health}`}>{healthText[account.health]}</span>
      </div>
    </article>
  );
}

function TopicBar({ topic }: { topic: TopicProfile }) {
  return (
    <article className="topic-row">
      <div className="topic-row__label">
        <strong>{topic.topic}</strong>
        <span>{topic.confidence}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${topic.confidence}%` }} />
      </div>
      <div className="topic-row__meta">
        <span>{topic.solved} AC</span>
        <span>{topic.failedAttempts} 次失败</span>
      </div>
    </article>
  );
}

function RecordTable({ records: tableRecords }: { records: ProblemRecord[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>平台</th>
            <th>题目</th>
            <th>难度</th>
            <th>标签</th>
            <th>状态</th>
            <th>日期</th>
          </tr>
        </thead>
        <tbody>
          {tableRecords.map((record) => (
            <tr key={record.id}>
              <td>{record.platform}</td>
              <td>
                <a href={record.url} target="_blank" rel="noreferrer">
                  {record.title}
                </a>
              </td>
              <td>{record.difficulty}</td>
              <td>
                <div className="tag-list">
                  {record.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <span className={`status-pill status-${record.status}`}>{statusText[record.status]}</span>
              </td>
              <td>{record.solvedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DigestList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="digest-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-card__top">
        <span>{recommendation.platform}</span>
        <strong>{qualityText[recommendation.sourceQuality]}</strong>
      </div>
      <h3>{recommendation.title}</h3>
      <div className="tag-list">
        <span className="tag strong">{recommendation.difficulty}</span>
        {recommendation.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <p>{recommendation.reason}</p>
      <button className="text-button" type="button">
        <Compass size={16} aria-hidden="true" />
        收入计划
      </button>
    </article>
  );
}

function titleForTab(tab: TabKey) {
  switch (tab) {
    case "overview":
      return "训练总览";
    case "records":
      return "刷题记录";
    case "insights":
      return "AI 复盘";
    case "recommendations":
      return "薄弱题推荐";
    case "blog":
      return "题解博客";
  }
}
