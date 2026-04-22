# bensack

Personal portfolio site built with Next.js. The repo combines resume/work content, ASCII-driven interactive scenes, and generative art experiments under `craft/`.

## Stack

- Next.js 13
- React 18
- TypeScript
- Stitches
- Framer Motion

## Local development

Requirements:

- Node.js 20
- npm

Setup:

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Defined in [.env.example](.env.example):

- `NEXT_PUBLIC_SITE_URL`
  Use the canonical public site URL for SEO and OG tags.
- `NEXT_PUBLIC_IPINFO_TOKEN`
  Optional. Enables the homepage "last visit from ..." location lookup.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run gen:attractor-scout -- --count 600 --shortlist 72
```

## Project structure

```text
components/   Shared UI, generative canvases, dock, SEO
docs/         Design notes, backlog, archived craft ideas
lib/          Content data and shared utilities
pages/        Next.js routes
public/       Static assets
scripts/      Local tooling, including attractor seed scouting
```

## Generative art workflow

The active pieces shown in `/craft` are driven from [lib/data.ts](lib/data.ts). Each genart tile maps to a `type` plus a deterministic `seed`.

To scout `strange-attractor` seeds in bulk:

```bash
npm run gen:attractor-scout -- --count 2000 --shortlist 80 --target-seed 056987
```

Outputs are written to `out/attractor-scout/`:

- `index.html` for visual review
- `report.json` for metrics
- `shortlist.txt` for top global picks
- `target-matches.txt` for seeds visually similar to a reference seed

## Deployment

This repo is set up for Netlify with [netlify.toml](netlify.toml).

Recommended environment variables in Netlify:

- `NEXT_PUBLIC_SITE_URL=https://sack.sh`
- `NEXT_PUBLIC_IPINFO_TOKEN=...` if you want visitor location enabled

Netlify should auto-detect the project, but the committed defaults are:

- build command: `npm run build`
- publish directory: `.next`
- Node.js version: `20`

## CI

A simple GitHub Actions workflow is included at [.github/workflows/ci.yml](.github/workflows/ci.yml). It installs dependencies, runs `tsc`, and verifies production buildability on pushes and pull requests.

## Notes

- Generated scout outputs are ignored via `.gitignore`.
- There is currently no open-source license file in this repo, so assume all rights reserved unless that changes.
