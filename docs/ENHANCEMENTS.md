# Possible Enhancements

_June 16, 2026_

Feature ideas from a full-site review. Roughly ordered by impact-to-effort within each
section. The hard, differentiating engineering (ASCII engine, generative art, spring dock)
is already done — most of these are about making that cleverness legible, narrative, and
playable for a first-time visitor.

Suggested first batch, by impact-to-effort:

1. Bio rewrite + `data.ts` copy/typo pass (fast, pure win)
2. Make `playground` discoverable (unlocks work already shipped)
3. Cursor-reactive buddies (standout creative feature)
4. Resolve Photos with the images already added

---

## Creative / Interactive

- **Cursor-reactive buddies** — the engine exists but the only interaction is the `+`/`-`
  spawn buttons. Make buddies path toward the cursor, scatter on click, or converge on a
  dropped glyph of "food." Turns the home page from "look at this" into "play with this" —
  the single biggest available lever.
- **Buddy that types the bio** — instead of (or alongside) the scramble reveal, have one
  buddy walk across the bio line leaving characters behind it, as if writing the text. Ties
  the two signature moments (buddies + letter-shuffle) into one.
- **Persistent named buddy** — first visit spawns a buddy, names it, and `localStorage`
  remembers it next time ("welcome back — [name] missed you"). Pairs with the existing
  "last visit from {city}" header.
- **Craft "remix" controls** — `/craft/[slug]` already syncs a `?seed=` param. Expose a
  "shuffle seed" / param sliders on the detail page so visitors generate their own attractor
  and copy a shareable link. Turns passive art into a toy.
- **Keyboard easter egg** — a key combo (or the backlog's `1`–`4` mode switches taken
  further) that floods the screen with buddies or flips the site into "city at night."
  Reward the curious.

---

## Design / Visual

- **One accent color, extreme restraint** — grayscale is elegant but nothing sticks. A
  single warm hue on the active dock dot, the name, and link hovers gives a memory hook
  without betraying the minimalism. _(Also in DESIGN_BACKLOG / DESIGN_REVIEW.)_
- **Ground the bio to the field** — the bio floats at `top: 9vh` over the 5%-opacity ASCII
  field with no visual relationship. A whisper-subtle frosted backdrop or a thin baseline
  rule under the buddies would compose them instead of stacking them.
- **Make `playground` discoverable** — the whole interactive engine hides behind a `gray8`
  11px "playground" link over a 5%-opacity background; first-time visitors will never find
  the best part of the site. Add a one-time arrival hint, a brief auto-reveal-then-fade of
  the field, or higher contrast on the toggle.
- **Reduced-motion + tab-hidden fallbacks** — honor `prefers-reduced-motion` (render one
  static art frame) and pause the rAF loop on `visibilitychange`. Polish, respectful
  defaults, and a CPU win in background tabs. _(Also in DESIGN_BACKLOG.)_

---

## Copy / Voice

- **Rewrite the bio to match the energy** — highest-ROI text change. The work-page summary
  still reads "Engineer focused on building. reliable systems..." (note the stray period
  after "building") — LinkedIn voice on a site with ASCII creatures. The home line ("also
  responsible for whatever this is") already nails the tone; bring the rest up to it.
- **One line of context per craft piece** — all 18 items are bare titles ("Strange
  Attractor IV"). A single sentence (what the algorithm is, why it's beautiful) turns a
  gallery into a point of view and gives a reason to click into `[slug]`.
- **`data.ts` copy pass** — fix small inconsistencies and typos (e.g. "technical
  consultent" → "consultant", stray period in the summary). One quick sweep across the file.

---

## Content / Structure

- **Resolve the Photos dead-end** — it sits in the dock with equal weight to Work and Craft
  but renders an empty heading. The newly added `bristol-studios.jpg`,
  `literally-balling.jpg`, `streets-ahead.jpg` could feed a real masonry grid (the same
  `react-masonry-css` Craft uses), or pull Photos from the dock until it's ready.
- **A real "now" / changelog moment** — `data.ts` has a rich `currently` array (Nvidia
  platform, Meta ETL framework, Backline) that's perfect for a small dated "what I'm working
  on" section. Dated entries signal the site is alive.
- **Connect or hide placeholder craft assets** — ensure no stale video stubs (historically
  a shared `peach.mp4`) ship in nav; current items are all genArt, keep it that way.

---

## Technical / Delight (low effort, high charm)

- **Animated favicon** — cycle 3–4 ASCII frames while the tab is visible.
- **Per-craft OG image** — render the actual attractor as the share preview so links unfurl
  with the art itself rather than the generic `og.png`.
- **`/buddies` or `/zoo` page** — a field guide documenting the 18 species; leans into the
  thing people remember and is genuinely fun to read.
