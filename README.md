# Lëtz World — Luxembourg in the world's news

A static website aggregating news **about Luxembourg** from **non-Luxembourgish media** (all `.lu` outlets excluded). Covers 20 languages with articles from Google News locale editions, international outlet RSS feeds, and YouTube videos.

The site itself can be read in **Lëtzebuergesch, Deutsch, Français, or English** — every headline and summary is machine-translated into all four (original text on hover), and the whole UI switches language with the LB/DE/FR/EN toggle in the header.

**Live:** https://frenkesch-beep.github.io/luxembourg-news/

## How it works

A Node.js fetcher runs hourly via GitHub Actions to:
1. Fetch from 22 Google News locales, 20 international outlet feeds, and 11 YouTube search queries
2. Filter, deduplicate, and tag articles per [CONTRACT.md](CONTRACT.md) rules
3. Write `public/data/items.json` (max 1500 items, rolling 30-day window)
4. Deploy `public/` to GitHub Pages

The frontend is vanilla HTML/CSS/JS with no build step—it fetches and renders the JSON client-side.

## Run locally

```bash
npm install
npm run fetch
# Serve public/ with any static server, e.g.:
npx http-server public
```

Then open http://localhost:8080 (or your server's address).

## Configuration

Sources are configured in `data/sources.json`:
- **Google News**: 22 locale editions in different languages
- **Outlets**: 20 RSS feeds from international news orgs (BBC, Politico Europe, Euronews, DW, Al Jazeera, etc.)
- **YouTube**: 11 search queries in various languages
- **Exclude list**: 33 Luxembourgish domains to filter out

Add, remove, or edit entries in `data/sources.json` and the fetcher will pick them up on the next run.

## Built by

Multi-model Claude agent team (Fable orchestration, Opus pipeline, Sonnet sources & frontend, Haiku docs) — July 2026
