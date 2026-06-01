import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

type PostType = 'algorithm' | 'project' | 'review' | 'life';

type PostTypeConfig = {
  dir: string;
  category: string;
  cover: string;
  tags: string[];
  body: (title: string) => string;
};

const POST_TYPES: Record<PostType, PostTypeConfig> = {
  algorithm: {
    dir: 'algorithm',
    category: '算法题解',
    cover: '/img/elysia/cover-06.webp',
    tags: ['algorithm'],
    body: (title) => `## 题目背景

记录这道题的来源、难点和当时卡住的位置。

## 思路

写清楚关键观察、状态设计或核心转化。

## 实现

说明边界条件、复杂度和容易写错的细节。

## 复盘

- 为什么一开始没有想到这个做法：
- 哪个条件最容易漏：
- 下次遇到类似题型时先检查什么：

## 代码

\`\`\`cpp
// ${title}
\`\`\`
`,
  },
  project: {
    dir: 'project',
    category: '项目日志',
    cover: '/img/elysia/cover-01.webp',
    tags: ['project'],
    body: () => `## 背景

这次改动要解决什么问题？

## 方案

为什么选择这个实现路径？

## 结果

完成了哪些可见变化？

## 后续

还有哪些可以继续优化的地方？
`,
  },
  review: {
    dir: 'review',
    category: '周复盘',
    cover: '/img/elysia/cover-10.webp',
    tags: ['review', 'training'],
    body: () => `## 本周概览

- 主要平台：
- 训练主题：
- 完成情况：

## 数据记录

| 指标 | 数值 | 备注 |
| --- | --- | --- |
| 提交数 |  |  |
| 通过数 |  |  |
| 参与比赛 |  |  |
| 重点题型 |  |  |

## 薄弱题型

- 题型：
- 表现：
- 原因：
- 补救计划：

## 错因模式

- 待补充

## 值得写成题解的题

- 待补充

## 下周计划

- 待补充
`,
  },
  life: {
    dir: 'life',
    category: '随笔',
    cover: '/img/elysia/cover-03.webp',
    tags: ['life'],
    body: () => `## 记一点现在

写下这段时间的想法、阅读、生活碎片或灵感。

## 留给之后

未来回看时，希望自己记住什么？
`,
  },
};

type Options = {
  type?: PostType;
  title?: string;
  slug?: string;
  description?: string;
  dryRun?: boolean;
};

type ResolvedOptions = {
  type: PostType;
  title: string;
  description: string;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--') {
      continue;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--type' && next) {
      options.type = next as PostType;
      i += 1;
    } else if (arg === '--title' && next) {
      options.title = next;
      i += 1;
    } else if (arg === '--slug' && next) {
      options.slug = next;
      i += 1;
    } else if (arg === '--description' && next) {
      options.description = next;
      i += 1;
    }
  }

  return options;
}

function isPostType(value: string | undefined): value is PostType {
  return Boolean(value && value in POST_TYPES);
}

function formatLocalDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function makeSlug(input: string) {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  if (slug) return slug;

  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderArray(values: string[]) {
  return values.map((value) => `  - ${value}`).join('\n');
}

function renderPost(type: PostType, title: string, description: string) {
  const config = POST_TYPES[type];
  return `---
title: "${title}"
description: "${description}"
date: ${formatLocalDate()}
cover: ${config.cover}
tags:
${renderArray(config.tags)}
categories:
  - ${config.category}
audience:
  - 想快速了解这篇内容适合谁的读者
prerequisites:
  - 暂无
takeaways:
  - 读完后应该带走的一个结论
nextSteps:
  - 读完后可以继续做的一件事
---

${config.body(title)}`;
}

async function promptForMissing(options: Options): Promise<ResolvedOptions> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const canPrompt = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  try {
    const typePrompt = options.type ?? (canPrompt ? await rl.question('文章类型 algorithm/project/review/life [project]: ') : 'project');
    const typeAnswer = typePrompt || 'project';
    const type = isPostType(typeAnswer) ? typeAnswer : 'project';
    const title = options.title ?? (canPrompt ? await rl.question('文章标题: ') : '');
    if (!title.trim()) throw new Error('文章标题不能为空');
    const descriptionPrompt = options.description ?? (canPrompt ? await rl.question('文章摘要: ') : '');
    const description = descriptionPrompt || `${title} 的记录与复盘。`;
    return { type, title: title.trim(), description: description.trim() };
  } finally {
    rl.close();
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { type, title, description } = await promptForMissing(options);
  const config = POST_TYPES[type];
  const slug = makeSlug(options.slug ?? title);
  const targetDir = path.join(process.cwd(), 'src', 'content', 'blog', config.dir);
  const targetPath = path.join(targetDir, `${slug}.md`);
  const content = renderPost(type, title, description);

  if (await fileExists(targetPath)) {
    throw new Error(`文章已存在: ${targetPath}`);
  }

  if (options.dryRun) {
    console.log(content);
    return;
  }

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, content, 'utf8');
  console.log(`Created ${path.relative(process.cwd(), targetPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
