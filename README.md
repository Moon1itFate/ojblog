# ojblog

ojblog is a personal blog with an algorithm practice tracker built in. The blog is the main product surface; the OJ tracker is a focused feature for recording solved problems, turning reviews into posts, and planning the next training set.

## Similar Open Source Projects

There are useful partial matches, but no exact open-source match for this product shape:

- [AlgoTrack](https://github.com/PopoviciGabriel/AlgoTrack): a local C++/Qt desktop tracker for LeetCode, Codeforces, AtCoder style problem logs, tags, notes, and statistics.
- [OJHunt Lite](https://github.com/Liu233w/ojhunt-lite): a Python/web tool for querying accepted problems and submissions across many OJ platforms.
- [leet-tracker](https://github.com/dmiska25/leet-tracker): LeetCode-focused progress tracking with AI feedback and recommendation logic.

ojblog's intended gap is the combination of:

- multi-OJ solved-problem synchronization;
- blog-first problem notes and editorials;
- AI summary over personal solve history;
- weak-topic detection and cross-platform problem discovery.

## Current MVP

The first version is a Vite + React + TypeScript frontend with local mock data. It now uses a blog-first layout and includes:

- personal blog home page;
- article feed and category sidebar;
- about page with profile links;
- OJ tracker as a standalone blog feature;
- OJ account sync status cards;
- topic confidence profile;
- AI weekly review panel;
- weak-topic recommendation cards;
- recent problem record table.

## Product Roadmap

1. Add persistent storage for accounts, problem records, notes, tags, and AI digests.
2. Implement platform adapters, starting with Codeforces public API and import-based LeetCode support.
3. Add a normalized problem taxonomy for tags, difficulty, verdicts, and review state.
4. Connect an LLM provider for weekly summaries, mistake clustering, and blog draft generation.
5. Build recommendation ranking from weak topics, difficulty band, recency, and source quality.
6. Add export/import for Markdown posts and JSON backups.
7. Extract the OJ tracker into a reusable package, for example `@ojblog/tracker-template`.

## Data Direction

Core entities are already represented in `src/domain.ts`:

- `OjAccount`
- `ProblemRecord`
- `TopicProfile`
- `Recommendation`
- `AiDigest`

These types are intentionally frontend-friendly now, and can later become API DTOs shared with a backend.

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.
