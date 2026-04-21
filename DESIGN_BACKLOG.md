# Design Backlog

Ideas captured from design brainstorm sessions. Roughly prioritized.

---

## Interactions

- **Click-to-scatter** — clicking anywhere on the canvas bursts nearby constellation stars outward (repel force at click point)
- **Keyboard shortcuts** — press `1`–`4` to switch animation modes without using the picker buttons
- **Swipe gesture (mobile)** — swipe left/right to cycle through animation modes
- **Picker: hide on hover** — animation picker fades out when the user's cursor is near the bio text, reappears when mouse leaves the text region

---

## Animations

- **"Circuit" mode** — electrons traveling along a PCB-trace grid; nodes light up as signals pass through them. Characters: `+`, `─`, `│`, `╋`, `○`
- **Time-aware scene switching** — constellation mode auto-selects scene based on local time: city at night (20:00–06:00), wave/beach during the day
- **Constellation timer tuning** — increase scene hold time to 30–35 s; add a brief "dissolve" phase where stars drift free before snapping to the next scene
- **Wave scene depth** — add distant horizon lines behind the Kanagawa wave using lighter alpha characters to hint at open ocean

---

## Bio Card

- **Grain overlay** — subtle CSS `<canvas>` or SVG noise texture layered over the bio text container for a tactile, printed feel
- **Link hover glyphs** — hovering "databricks" or "disney" reveals a tiny ASCII logo/glyph inline (e.g. `[◆]` for Databricks)
- **Tagline shuffle on load** — the bio paragraph body-text does the same letter-shuffle reveal as the time/location header

---

## Misc / Polish

- **Favicon animation** — cycle the favicon between a few ASCII frames (subtle; only when tab is visible)
- **Reduced-motion fallback** — when `prefers-reduced-motion` is set, replace all canvas animations with a single static art scene rendered once

---

## Performance

- **Dynamically import `SignalField`** — 2,007-line ASCII engine loads synchronously on the home page; use `next/dynamic` with `ssr: false` to defer it
- **Pause rAF loop on hidden tab** — add `visibilitychange` listener to SignalField to pause/resume the animation loop; currently burns CPU when user switches tabs
- **ipinfo.io token** — empty token in `index.tsx` will fail silently after free-tier rate limit; move to `NEXT_PUBLIC_IPINFO_TOKEN` env var

---

## Code Structure

- **Extract `shuffleLetters`** — duplicated verbatim in `index.tsx:11–34` and `resume.tsx:10–33`; move to `lib/utils.ts`
- **Extract link hover CSS** — `resume.tsx` repeats `onMouseEnter/onMouseLeave` color swap 8+ times; replace with a Stitches class `'&:hover': { color: '$gray12' }`
- **Resolve `PerspectiveGrid.tsx`** — exists as a large, complex component but is wired to no page on the current branch; wire it up or move to a feature branch

---

## Content

- **Resume: render skills, education, and job descriptions** — `data.ts` has `education`, `skills`, `projects`, and per-job `description` fields; none currently render on `/resume`
- **Rewrite home bio** — "engineer focused on building reliable systems..." doesn't match the creative energy of the site; write copy that sounds like someone who built ASCII buddy creatures
- **Connect real craft video assets** — 26 items in `data.ts` all point to `assetUrl('peach.mp4')`; connect real recordings or pull craft from primary nav until they exist
- **Photos page** — linked from dock with equal weight as Resume/Craft but renders "coming soon"; deprioritize visually in dock or fill with real content

---

## Design

- **Add a single accent color** — pure grayscale palette is clean but lacks a visual anchor; one warm accent used on the name, active dock dot, or hover states would make the site more memorable without breaking minimalism
- **Make scene controls discoverable** — "rain" and "stars" buttons at `11px` / `color: gray8` control the most delightful part of the experience; increase contrast or add a visual hint on arrival
- **Ground text overlay to ASCII field** — home page bio floats at `top: 9vh` with no visual relationship to the background; a subtle frosted-glass backdrop or spatial anchoring would unify them
