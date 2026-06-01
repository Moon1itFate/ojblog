# 文章发布与维护流程

这个博客的文章发布模式是“仓库内写作、构建时生成页面”。目前默认只有仓库维护者可以发表文章，读者互动通过评论区完成。

## 新建文章

文章放在 `src/content/blog` 下面，按主题分目录：

- `algorithm`: 算法题解
- `project`: 项目日志
- `review`: 周复盘
- `life`: 随笔

推荐文件名使用小写英文和短横线，例如：

```text
src/content/blog/algorithm/interval-dp-notes.md
```

## Frontmatter 模板

```yaml
---
title: "文章标题"
description: "一句话说明文章内容。"
date: 2026-06-01 20:00:00
updated: 2026-06-01 21:30:00
cover: /img/elysia/cover-01.webp
tags:
  - algorithm
  - dp
categories:
  - 算法题解
---
```

常用字段：

- `title`: 文章标题，必填。
- `description`: 摘要，会用于文章卡片和 SEO。
- `date`: 发布时间，必填。
- `updated`: 更新时间，可选。
- `cover`: 封面图，可选。
- `tags`: 标签数组，可选。
- `categories`: 分类数组，可选。
- `sticky`: 是否置顶，可选。
- `draft`: 草稿开关，生产构建会隐藏 `draft: true` 的文章。
- `comments`: 单篇文章关闭评论时设为 `false`。

## 发布前检查

```bash
corepack pnpm check
corepack pnpm build
```

如果文章中新增了图片，放到 `public/img` 下，再用 `/img/...` 引用。

## 维护原则

- 题解文章优先写清楚错因、关键转移和边界条件。
- 周复盘优先写下一步行动，而不是只罗列数量。
- 项目日志记录真实决策，包含为什么做、为什么暂时不做。
- 读者评论留在文章底部，文章内容本身仍由仓库维护者发布。
