import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileText,
  Github,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  accounts,
  aiDigest,
  blogPosts,
  profile,
  records,
  recommendations,
  topics,
  type BlogPost,
  type OjAccount,
  type ProblemRecord,
  type Recommendation,
  type TopicProfile,
} from "./domain";

type PageKey = "home" | "posts" | "oj" | "about";

const navItems: Array<{ key: PageKey; label: string }> = [
  { key: "home", label: "首页" },
  { key: "posts", label: "文章" },
  { key: "oj", label: "刷题追踪" },
  { key: "about", label: "关于" },
];

const statusText: Record<ProblemRecord["status"], string> = {
  solved: "已通过",
  reviewing: "待复盘",
  stuck: "卡住",
};

const healthText: Record<OjAccount["health"], string> = {
  synced: "已同步",
  stale: "待更新",
  manual: "手动导入",
};

const qualityText: Record<Recommendation["sourceQuality"], string> = {
  classic: "经典题",
  "contest-core": "比赛核心",
  "editorial-rich": "题解丰富",
};

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return blogPosts;

    return blogPosts.filter((post) =>
      [post.title, post.excerpt, post.category, ...post.tags].join(" ").toLowerCase().includes(value),
    );
  }, [query]);

  const solvedTotal = accounts.reduce((sum, account) => sum + account.solvedCount, 0);
  const submissionTotal = accounts.reduce((sum, account) => sum + account.submissionCount, 0);
  const strongestTopic = [...topics].sort((a, b) => b.confidence - a.confidence)[0];
  const weakestTopic = [...topics].sort((a, b) => a.confidence - b.confidence)[0];
  const featuredPost = blogPosts[0];

  return (
    <main className="site-shell">
      <Header activePage={activePage} onNavigate={setActivePage} />

      {activePage === "home" && (
        <HomePage
          featuredPost={featuredPost}
          solvedTotal={solvedTotal}
          submissionTotal={submissionTotal}
          strongestTopic={strongestTopic}
          weakestTopic={weakestTopic}
          onNavigate={setActivePage}
        />
      )}
      {activePage === "posts" && (
        <PostsPage query={query} setQuery={setQuery} posts={filteredPosts} />
      )}
      {activePage === "oj" && (
        <OjTrackerPage
          solvedTotal={solvedTotal}
          submissionTotal={submissionTotal}
          weakestTopic={weakestTopic}
        />
      )}
      {activePage === "about" && <AboutPage />}
    </main>
  );
}

function Header({
  activePage,
  onNavigate,
}: {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <header className="site-header">
      <button className="brand-link" type="button" onClick={() => onNavigate("home")}>
        <span className="brand-mark">MF</span>
        <span>
          <strong>{profile.name}</strong>
          <small>{profile.handle}</small>
        </span>
      </button>

      <nav className="site-nav" aria-label="主导航">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={activePage === item.key ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function HomePage({
  featuredPost,
  solvedTotal,
  submissionTotal,
  strongestTopic,
  weakestTopic,
  onNavigate,
}: {
  featuredPost: BlogPost;
  solvedTotal: number;
  submissionTotal: number;
  strongestTopic: TopicProfile;
  weakestTopic: TopicProfile;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Personal Blog / Algorithm Notes</p>
          <h1>{profile.headline}</h1>
          <p className="hero-lead">{profile.bio}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("posts")}>
              <BookOpen size={17} aria-hidden="true" />
              阅读文章
            </button>
            <button className="ghost-button" type="button" onClick={() => onNavigate("oj")}>
              <BarChart3 size={17} aria-hidden="true" />
              查看刷题追踪
            </button>
          </div>
        </div>

        <aside className="hero-panel" aria-label="博客概览">
          <div className="panel-heading">
            <span>当前关注</span>
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <h2>{featuredPost.title}</h2>
          <p>{featuredPost.excerpt}</p>
          <div className="mini-meta">
            <span>{featuredPost.category}</span>
            <span>{featuredPost.readingTime}</span>
          </div>
        </aside>
      </section>

      <section className="stats-strip">
        <StatCard icon={FileText} label="已整理文章" value={`${blogPosts.length}`} />
        <StatCard icon={CheckCircle2} label="累计 AC" value={`${solvedTotal}`} />
        <StatCard icon={RefreshCw} label="提交记录" value={`${submissionTotal}`} />
        <StatCard icon={Target} label="待加强" value={weakestTopic.topic} />
      </section>

      <section className="section-grid">
        <div className="content-section">
          <SectionTitle eyebrow="Latest Writing" title="最近文章" />
          <div className="post-list">
            {blogPosts.slice(0, 3).map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        </div>

        <div className="content-section accent-section">
          <SectionTitle eyebrow="OJ Tracker" title="刷题追踪小组件" />
          <div className="tracker-summary">
            <div>
              <span>强项</span>
              <strong>{strongestTopic.topic}</strong>
            </div>
            <div>
              <span>弱项</span>
              <strong>{weakestTopic.topic}</strong>
            </div>
          </div>
          <p className="section-copy">
            刷题记录会作为博客中的一个独立功能存在，用来沉淀题解、复盘错误和推荐下一组训练题。
          </p>
          <button className="text-button" type="button" onClick={() => onNavigate("oj")}>
            打开模块
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function PostsPage({
  query,
  setQuery,
  posts,
}: {
  query: string;
  setQuery: (value: string) => void;
  posts: BlogPost[];
}) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Writing</p>
          <h1>文章与题解</h1>
          <p>把学习笔记、算法题解和复盘沉淀在同一个博客里。</p>
        </div>
        <label className="search-box" aria-label="搜索文章">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章、标签、分类"
          />
        </label>
      </section>

      <section className="article-layout">
        <div className="article-feed">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        <aside className="blog-sidebar">
          <SectionTitle eyebrow="Categories" title="分类" />
          <div className="category-list">
            {["算法题解", "学习笔记", "项目日志", "周复盘"].map((category) => (
              <button key={category} type="button">
                {category}
              </button>
            ))}
          </div>
          <SectionTitle eyebrow="Topics" title="常写标签" />
          <div className="tag-list">
            {["dp", "graph", "react", "typescript", "review"].map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function OjTrackerPage({
  solvedTotal,
  submissionTotal,
  weakestTopic,
}: {
  solvedTotal: number;
  submissionTotal: number;
  weakestTopic: TopicProfile;
}) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">OJ Tracker</p>
          <h1>刷题追踪</h1>
          <p>这个模块先嵌入个人博客，后续会提取成可复用模板包。</p>
        </div>
        <button className="primary-button" type="button">
          <RefreshCw size={17} aria-hidden="true" />
          同步数据
        </button>
      </section>

      <section className="stats-strip">
        <StatCard icon={Trophy} label="累计 AC" value={`${solvedTotal}`} />
        <StatCard icon={Code2} label="提交次数" value={`${submissionTotal}`} />
        <StatCard icon={Brain} label="AI 复盘" value="7 天" />
        <StatCard icon={Target} label="当前弱项" value={weakestTopic.topic} />
      </section>

      <section className="section-grid wide-left">
        <div className="content-section">
          <SectionTitle eyebrow="Platforms" title="OJ 账号" />
          <div className="account-list">
            {accounts.map((account) => (
              <AccountRow key={account.platform} account={account} />
            ))}
          </div>
        </div>
        <div className="content-section">
          <SectionTitle eyebrow="AI Review" title={aiDigest.title} />
          <p className="section-copy">{aiDigest.summary}</p>
          <ul className="digest-list">
            {aiDigest.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-grid">
        <div className="content-section">
          <SectionTitle eyebrow="Topic Profile" title="题型画像" />
          <div className="topic-stack">
            {topics.map((topic) => (
              <TopicBar key={topic.topic} topic={topic} />
            ))}
          </div>
        </div>
        <div className="content-section">
          <SectionTitle eyebrow="Recommendations" title="薄弱题推荐" />
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <RecommendationItem key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionTitle eyebrow="Records" title="最近刷题记录" />
        <ProblemTable records={records} />
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="page-stack">
      <section className="about-section">
        <div>
          <p className="eyebrow">About</p>
          <h1>{profile.name}</h1>
          <p>{profile.bio}</p>
          <div className="contact-row">
            <a href={profile.githubUrl} target="_blank" rel="noreferrer">
              <Github size={17} aria-hidden="true" />
              GitHub
            </a>
            <a href={`mailto:${profile.email}`}>
              <Mail size={17} aria-hidden="true" />
              Email
            </a>
          </div>
        </div>
        <div className="timeline-card">
          <SectionTitle eyebrow="Next" title="下一阶段" />
          <ol>
            <li>完善文章详情页和 Markdown 渲染。</li>
            <li>把刷题追踪拆为 `@ojblog/tracker-template`。</li>
            <li>接入真实 OJ 数据源和大模型复盘。</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <article className="stat-card">
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function PostRow({ post }: { post: BlogPost }) {
  return (
    <article className="post-row">
      <div className="post-date">
        <CalendarDays size={16} aria-hidden="true" />
        <span>{post.publishedAt}</span>
      </div>
      <div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <div className="mini-meta">
          <span>{post.category}</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="post-card">
      <div className="post-card__meta">
        <span>{post.category}</span>
        <span>{post.publishedAt}</span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <div className="post-card__footer">
        <div className="tag-list">
          {post.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <span>{post.readingTime}</span>
      </div>
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
      <div>
        <strong>{account.solvedCount} AC</strong>
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

function RecommendationItem({ recommendation }: { recommendation: Recommendation }) {
  return (
    <article className="recommendation-item">
      <div>
        <span>{recommendation.platform}</span>
        <h3>{recommendation.title}</h3>
      </div>
      <p>{recommendation.reason}</p>
      <div className="recommendation-footer">
        <span>{recommendation.difficulty}</span>
        <span>{qualityText[recommendation.sourceQuality]}</span>
      </div>
    </article>
  );
}

function ProblemTable({ records: tableRecords }: { records: ProblemRecord[] }) {
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
                  <ExternalLink size={13} aria-hidden="true" />
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
                <span className={`status-pill status-${record.status}`}>
                  {statusText[record.status]}
                </span>
              </td>
              <td>{record.solvedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
