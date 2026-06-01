# 文章评论配置

站点的文章页已经接入评论挂载点，当前默认使用 Giscus，把评论保存到 GitHub Discussions。配置完成后，读者可以在每篇文章底部登录 GitHub 发表评论和 reaction。

## GitHub 侧准备

1. 将 `Moon1itFate/ojblog` 设置为公开仓库。
2. 在仓库 `Settings -> General -> Features` 中开启 `Discussions`。
3. 安装 Giscus GitHub App，并授权访问 `Moon1itFate/ojblog`。
4. 打开 <https://giscus.app>，仓库填写 `Moon1itFate/ojblog`，Discussion 分类建议选择 `Announcements`。
5. 在页面底部生成的脚本里复制 `data-repo-id` 和 `data-category-id`。

## 项目侧配置

把复制到的两个 ID 填入 `config/site.yaml`：

```yaml
comment:
  provider: giscus
  giscus:
    repo: Moon1itFate/ojblog
    repoId: "R_kgDO..."
    category: Announcements
    categoryId: "DIC_kwDO..."
    mapping: pathname
    strict: '0'
    reactionsEnabled: '1'
    emitMetadata: '0'
    inputPosition: top
    lang: zh-CN
    loading: lazy
```

`repoId` 和 `categoryId` 为空时，站点会自动隐藏评论区，避免文章页显示一个不可用的评论框。

## 单篇文章关闭评论

如果某篇文章不想开放评论，在文章 frontmatter 中添加：

```yaml
comments: false
```
