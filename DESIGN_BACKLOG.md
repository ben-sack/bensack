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
