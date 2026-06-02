# 访问统计配置

站点访问统计使用 Umami。它负责在线记录真实访问，博客前端负责读取公开分享数据，并把统计结果嵌入到导航、文章卡片、文章封面、页脚和 `/stats` 可视化页面。

Umami 文档入口：https://umami.is/docs

## 能记录什么

- 全站访问量 PV、独立访客 UV、访问次数和阅读时长。
- 每篇文章的访问量，显示在文章封面、文章列表和 `/stats` 热门文章排行。
- 导航栏旁边的来访人数小徽章。
- 新访客首次进入站点时的轻量欢迎动效。
- 最近 7、30、90 天访问趋势。
- 访问来源和访问设备分布。

## 配置步骤

1. 准备一个 Umami 实例，可以使用 Umami Cloud，也可以自托管。
2. 在 Umami 中添加你正式部署后的博客域名。
3. 复制网站 ID，填入 `config/site.yaml` 的 `analytics.umami.id`。
4. 打开 Umami 的分享链接，复制 share token，填入 `statistics_display.token`。
5. 将 `enabled`、`article_page_views`、`footer_site_stats`、`dashboard` 都设为 `true`。

```yaml
analytics:
  umami:
    enabled: true
    id: your-umami-website-id
    endpoint: https://stats.example.com
    statistics_display:
      token: your-umami-share-token
      article_page_views: true
      footer_site_stats: true
      dashboard: true
      dashboard_days: 30
      nav_site_stats: true
      visitor_effect: true
```

## 开关说明

- `article_page_views`：文章封面和文章列表卡片显示阅读量。
- `footer_site_stats`：页脚显示全站访问量。
- `dashboard`：启用 `/stats` 详细统计页。
- `nav_site_stats`：导航栏显示来访人数徽章。
- `visitor_effect`：新访客首次进入时显示欢迎动效。

## 注意事项

- 本地开发访问不会补齐历史数据，只有部署后加载 Umami 脚本的真实访问才会进入统计。
- share token 是只读令牌，可以用于公开展示统计，但不要把 Umami 管理员账号或 API key 写进前端配置。
- 广告拦截器、隐私浏览器、重复刷新和跨域限制都会影响统计结果，访问量应作为趋势参考。
