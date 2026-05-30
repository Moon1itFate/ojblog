---
title: "ojblog 项目日志：迁移到 Astro Koharu"
description: "将原型替换为 astro-koharu 模板，并确认 AGPL-3.0 开源方向。"
date: 2026-05-30 16:15:00
cover: /img/elysia-garden.svg
tags:
  - astro
  - koharu
  - elysia
  - project
categories:
  - 项目日志
sticky: true
---

这次重构决定直接使用 `astro-koharu` 作为博客基础模板。

原因很简单：它已经具备个人博客需要的大部分结构，包括首页、文章列表、分类、标签、归档、友链、搜索、Markdown 增强和 RSS。

## 设计方向

布局继承 Koharu 的博客体验，但视觉上会围绕爱莉希雅的角色气质重新定制：

- 粉白、浅紫、晶蓝；
- 玻璃卡片和柔光背景；
- 飞花、水晶、梦幻花园；
- 轻 ACG 氛围，但仍然以阅读体验为核心。

因为 `astro-koharu` 使用 AGPL-3.0，本项目也会按开源项目来维护。
