---
title: "区间 DP：从最后一步反推状态"
description: "用 Burst Balloons 和石子合并复盘区间 DP 的状态定义。"
date: 2026-05-30 15:20:00
cover: /img/docx-covers/docx-cover-03.png
tags:
  - dp
  - interval
  - review
categories:
  - 算法题解
sticky: true
---

区间 DP 最容易卡住的地方，通常不是转移公式本身，而是第一步：**状态到底描述什么**。

以 Burst Balloons 为例，如果把思路放在“最先戳破哪个气球”，状态会很快变得混乱；但如果换成“最后戳破哪个气球”，左右边界就稳定下来了。

## 复盘重点

1. 先确定区间边界是否会变化。
2. 枚举最后一步操作，而不是第一步操作。
3. 用小样例手算一遍状态含义。
4. 写题解时记录“为什么这样定义状态”。

这类题后续会和 OJ Tracker 里的错题记录关联起来，形成可追踪的薄弱题型。
