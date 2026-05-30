# OJ Tracker Provider Guide

OJ Tracker 的公网同步层采用 provider registry。新增一个刷题网站时，优先把平台适配代码放到 `src/lib/tracker/providers.ts`，再注册到 `trackerProviders`。

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
4. 运行 `corepack pnpm check` 和 `corepack pnpm build`。
5. 如果平台 API 需要后端密钥或绕过 CORS，不要直接放在前端 fetch，改为后端 API route 或定时同步任务。

## 后续云端化方向

当前 registry 已经让前端同步可扩展。要做成持续更新服务，下一步应把同一组 `trackerProviders` 复用到服务端定时任务：

- 用户保存平台账号到数据库。
- Cron 定时读取账号并调用 provider。
- 同步结果写入 submissions、contests、daily_stats 表。
- 前端只读取数据库快照，不依赖用户打开页面触发同步。
