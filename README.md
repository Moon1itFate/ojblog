# ojblog

ojblog is an AGPL-3.0 personal blog based on [astro-koharu](https://github.com/cosZone/astro-koharu).

The site direction is:

- Koharu-style personal blog layout and content system;
- Elysia-inspired visual mood: soft pink, white, crystal blue, petals, glass panels, and a fantasy garden;
- algorithm editorials, project logs, weekly reviews, and life notes;
- an OJ Tracker section that will later become a reusable blog module/template package.

## License

This project now uses `astro-koharu` as its base template. `astro-koharu` is licensed under AGPL-3.0, so this repository keeps the same license and includes the upstream `LICENSE` file.

If the deployed site is publicly accessible, the corresponding modified source code should remain available as required by AGPL-3.0.

## Development

The upstream template uses pnpm.

```bash
corepack enable
pnpm install
pnpm dev
```

Build:

```bash
pnpm build
```

## Customized Content

Current customizations:

- `config/site.yaml`: site profile, navigation, categories, featured series, social links, and tracker entry.
- `public/img/elysia-garden.svg`: original Elysia-inspired garden/crystal visual.
- `src/content/blog`: initial posts for algorithm notes, project logs, weekly review, and life notes.
- `src/pages/tracker.md`: OJ Tracker planning page.

## Reader Memory

The blog includes a lightweight client-side reader memory:

- article pages record local reading progress;
- the sidebar shows recently read posts with progress bars;
- article pages can be saved to a local "read later" list;
- all reader memory stays in the visitor's browser `localStorage` and does not require a backend.

## Site App Metadata

The public site ships with `/site.webmanifest` and `/icon.svg`, so browsers can identify the blog with a dedicated app icon, theme color, and quick shortcuts for articles, the OJ Tracker, and traffic stats.

## Comments

Article comments are wired through Giscus and GitHub Discussions. See `docs/comment-setup.md` for the repository-side setup and the two IDs that must be copied into `config/site.yaml`.

## Writing Workflow

Posts are maintained in `src/content/blog` and published through the repository build. See `docs/writing-workflow.md` for the frontmatter template, category layout, and release checks.

Useful commands:

```bash
corepack pnpm new:post -- --type project --title "My new post"
corepack pnpm new:post -- --type review --title "Weekly OJ review"
```

Maintenance notes live in `docs/maintenance.md`, and the weekly review structure lives in `docs/weekly-review-template.md`.

Traffic analytics use Umami. Configure `analytics.umami` in `config/site.yaml` to show ambient visitor badges in the nav, article view badges on covers/cards, footer totals, and the `/stats` dashboard. Setup notes live in `docs/analytics-setup.md`.

## OJ Tracker Roadmap

1. Start as a page and content category inside the blog.
2. Add normalized OJ account/problem/review data.
3. Connect platform sync/import adapters.
4. Add AI-powered weekly summaries and weak-topic recommendations.
5. Extract the tracker as a reusable package, such as `@ojblog/tracker-template`.
