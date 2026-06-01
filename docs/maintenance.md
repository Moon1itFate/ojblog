# 站点维护手册

这份文档把 Moonlit Fate 的日常维护动作集中到一个地方。

## 本地启动

```bash
corepack pnpm install
corepack pnpm dev
```

常用地址：

- 博客：`http://127.0.0.1:4321`
- 刷题追踪：`http://127.0.0.1:4321/tracker`
- 本地 CMS：`corepack pnpm cms`

## 写文章

```bash
corepack pnpm new:post -- --type project --title "文章标题"
```

发文流程见 `docs/writing-workflow.md`。
周复盘结构见 `docs/weekly-review-template.md`。

## 评论

评论系统使用 Giscus。正式启用前需要：

- 仓库公开；
- 开启 GitHub Discussions；
- 安装 Giscus App；
- 在 `config/site.yaml` 填入 `repoId` 和 `categoryId`。

详细步骤见 `docs/comment-setup.md`。

## 刷题追踪

新增平台 provider 时优先保持：

- 独立输入输出；
- 错误提示可读；
- 不把敏感凭证写进前端；
- 输出结构能被统计和 AI 复盘复用。

说明页见 `/tracker-guide`，代码主要在 `src/lib/tracker` 和 `src/components/tracker`。

## 发布前检查

```bash
corepack pnpm check
corepack pnpm build
```

如果只改文章，也建议跑一次 build，确认文章路由、标签页、RSS 和搜索索引都能生成。

## 推送

```bash
git status --short
git add <files>
git commit -m "..."
git push origin main
```

Windows 环境下 Husky hook 如果找不到 `sh`，可以在已经手动完成检查后用：

```bash
git -c core.hooksPath= commit -m "..."
```
