# OJ Tracker Provider Guide

OJ Tracker 的公网同步层采用 provider registry。新增一个刷题网站时，优先把平台适配代码放到 `src/lib/tracker/providers.ts`，必要时再为受 CORS 或鉴权限制的平台增加 Astro API route。

## Provider 结构

每个平台需要提供一份元信息：

```ts
{
  platform: 'new-oj',
  name: 'New OJ',
  accountLabel: 'New OJ User ID',
  accountPlaceholder: '例如 your_handle',
  homepage: 'https://example.com',
  supports: {
    submissions: true,
    contests: false,
  },
  fetchSubmissions,
  fetchContests,
}
```

`platform` 是内部稳定 ID，会写入快照、提交记录、比赛记录和浏览器缓存。确定后尽量不要改名。

## 必需数据模型

提交记录统一转换成 `OjSubmission`：

```ts
{
  id: 'new-oj:123',
  platform: 'new-oj',
  problemKey: 'abc001-a',
  problemName: 'ABC001 A - Something',
  contestId: 'abc001',
  verdict: 'AC',
  accepted: true,
  tags: ['dp'],
  rating: 1200,
  language: 'C++',
  submittedAt: new Date(epoch * 1000).toISOString(),
  sourceUrl: 'https://example.com/submissions/123',
}
```

比赛记录统一转换成 `ContestRecord`。如果平台没有公开比赛历史，可以不提供 `fetchContests`，并把 `supports.contests` 设为 `false`。

## 添加步骤

1. 在 `providers.ts` 中为目标网站声明 API 响应类型。
2. 实现 `fetchNewOjSubmissions(handle)`，必要时实现 `fetchNewOjContests(handle)`。
3. 把 provider 对象加入 `trackerProviders` 数组。
4. 如果平台 API 需要后端密钥或绕过 CORS，不要直接放在前端 `fetch`，改为 Astro API route 或定时同步任务。
5. 运行 `corepack pnpm check` 和 `corepack pnpm build`。

## 已接入平台

- Codeforces：前端直接调用公开 JSON API，支持提交和比赛历史。
- AtCoder：前端调用 kenkoooo submissions API 和 AtCoder history JSON，支持提交和比赛历史。
- 牛客：通过同源 API route `/api/tracker/nowcoder/[userId]/tests` 抓取公开个人刷题页，再解析 `window.__INITIAL_STATE__`。牛客页面没有开放跨域响应头，所以该平台需要服务端运行时。
- 洛谷：通过同源 API route `/api/tracker/luogu/[userId]/practice` 读取公开练习记录，支持已通过题目、尝试题目和公开 rating 比赛记录。若用户开启练习记录隐私保护，洛谷会拒绝公开同步。

## 部署说明

牛客同步需要服务端代理，因此项目现在使用 Astro Node adapter。构建后可以通过 `pnpm start` 运行 `dist/server/entry.mjs`，适合部署到 VPS、Docker、Railway、Render 等支持 Node 服务的平台。

如果只部署到纯静态托管，Codeforces 和 AtCoder 仍可继续使用，但牛客同步的 API route 无法运行。

## 后续云端化方向

当前 registry 已经让前端同步可扩展。要做成持续更新服务，下一步应把同一组 `trackerProviders` 复用到服务端定时任务：

- 用户保存平台账号到数据库。
- Cron 定时读取账号并调用 provider。
- 同步结果写入 `submissions`、`contests`、`daily_stats` 表。
- 前端只读取数据库快照，不依赖用户打开页面触发同步。
