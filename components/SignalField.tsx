import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// ─── Modes ─────────────────────────────────────────────────────────────────────
export type FieldMode = 'density' | 'waves' | 'rain' | 'city' | 'surf' | 'bots'

// ─── Character ramps ───────────────────────────────────────────────────────────
const DENSITY_RAMP = [' ', '.', ':', ';', '=', '+', 'x', '#', '@'] as const
const WAVES_RAMP   = [' ', ',', '-', '~', '≈', '≈', '^', '^', '@'] as const

function toRampIdx(v: number): number {
  if (v < -0.55) return 0
  if (v < -0.10) return 1
  if (v <  0.15) return 2
  if (v <  0.40) return 3
  if (v <  0.65) return 4
  if (v <  0.90) return 5
  if (v <  1.15) return 6
  if (v <  1.40) return 7
  return 8
}

// ─── Field functions ───────────────────────────────────────────────────────────
function densityField(nx: number, ny: number, t: number): number {
  return (
    Math.sin(nx * 4.5 + t * 0.32 + ny * 2.1) * 0.42 +
    Math.sin(nx * 8.8 - ny * 2.6 + t * 0.20) * 0.28 +
    Math.sin(nx * 2.0 + ny * 4.8 + t * 0.17) * 0.30
  )
}

function wavesField(nx: number, ny: number, t: number): number {
  const swell = Math.sin(nx * 2.8 - t * 1.2 + ny * 0.5) * 0.50
  const chop  = Math.sin(nx * 5.5 - t * 2.0 + ny * 1.8 + 1.2) * 0.28
  const cross = Math.sin(nx * 1.5 + ny * 3.2 - t * 0.7 + 2.8) * 0.22
  const v = swell + chop + cross
  return v > 0 ? v + v * v * 0.5 : v * 0.85
}

// ─── Layout ────────────────────────────────────────────────────────────────────
const CELL_W      = 11
const CELL_H      = 18
const FONT        = '12px Menlo, "Courier New", monospace'
const DARK_ALPHA  = [0, 0.07, 0.09, 0.12, 0.15, 0.22, 0.34, 0.46, 0.58]
const LIGHT_ALPHA = [0, 0.05, 0.07, 0.09, 0.11, 0.16, 0.25, 0.36, 0.48]

// ─── ArtCell type ──────────────────────────────────────────────────────────────
interface ArtCell { col: number; row: number; ch: string }

// ─── Claude Code buddies ────────────────────────────────────────────────────────
// ASCII art from the original Claude Code /buddy command.
// Each species has 3 animation frames × 5 lines of 12 chars.
// '·' is the eye placeholder — replaced at render time from BUDDY_EYES.

const BUDDY_EYES = ['·', '◉', '×', '°', '@', '✦']

// prettier-ignore
const BUDDY_BODIES: Record<string, string[][]> = {
  duck: [
    ['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--\u00b4    '],
    ['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--\u00b4~   '],
    ['            ','    __      ','  <(·)___   ','   (  .__>  ','    `--\u00b4    '],
  ],
  goose: [
    ['            ','     (·>    ','     ||     ','   _(__)_   ','    ^^^^    '],
    ['            ','    (·>     ','     ||     ','   _(__)_   ','    ^^^^    '],
    ['            ','     (·>>   ','     ||     ','   _(__)_   ','    ^^^^    '],
  ],
  blob: [
    ['            ','   .----.   ','  ( ·  · )  ','  (      )  ','   `----\u00b4   '],
    ['            ','  .------.  ',' (  ·  ·  ) ',' (        ) ','  `------\u00b4  '],
    ['            ','    .--.    ','   (·  ·)   ','   (    )   ','    `--\u00b4    '],
  ],
  cat: [
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")~  '],
    ['            ','   /\\-/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
  ],
  dragon: [
    ['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-\u00b4  '],
    ['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (        ) ','  `-vvvv-\u00b4  '],
    ['   ~    ~   ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-\u00b4  '],
  ],
  octopus: [
    ['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  '],
    ['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  \\/\\/\\/\\/  '],
    ['     o      ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  '],
  ],
  owl: [
    ['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   `----\u00b4   '],
    ['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   .----.   '],
    ['            ','   /\\  /\\   ','  ((·)(-))  ','  (  ><  )  ','   `----\u00b4   '],
  ],
  penguin: [
    ['            ','  .---.     ','  (·>·)     ',' /(   )\\    ','  `---\u00b4     '],
    ['            ','  .---.     ','  (·>·)     ',' |(   )|    ','  `---\u00b4     '],
    ['  .---.     ','  (·>·)     ',' /(   )\\    ','  `---\u00b4     ','   ~ ~      '],
  ],
  turtle: [
    ['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','  ``    ``  '],
    ['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','   ``  ``   '],
    ['            ','   _,--._   ','  ( ·  · )  ',' /[======]\\ ','  ``    ``  '],
  ],
  snail: [
    ['            ',' ·    .--.  ','  \\  ( @ )  ','   \\_`--\u00b4   ','  ~~~~~~~   '],
    ['            ','  ·   .--.  ','  |  ( @ )  ','   \\_`--\u00b4   ','  ~~~~~~~   '],
    ['            ',' ·    .--.  ','  \\  ( @  ) ','   \\_`--\u00b4   ','   ~~~~~~   '],
  ],
  ghost: [
    ['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~`~``~`~  '],
    ['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  `~`~~`~`  '],
    ['    ~  ~    ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~~`~~`~~  '],
  ],
  axolotl: [
    ['            ','}~(______)\u007e{','}~(· .. ·)\u007e{','  ( .--. )  ','  (_/  \\_)  '],
    ['            ','~}(______){~','~}(· .. ·){~','  ( .--. )  ','  (_/  \\_)  '],
    ['            ','}~(______)\u007e{','}~(· .. ·)\u007e{','  (  --  )  ','  ~_/  \\_~  '],
  ],
  capybara: [
    ['            ','  n______n  ',' ( ·    · ) ',' (   oo   ) ','  `------\u00b4  '],
    ['            ','  n______n  ',' ( ·    · ) ',' (   Oo   ) ','  `------\u00b4  '],
    ['    ~  ~    ','  u______n  ',' ( ·    · ) ',' (   oo   ) ','  `------\u00b4  '],
  ],
  cactus: [
    ['            ',' n  ____  n ',' | |·  ·| | ',' |_|    |_| ','   |    |   '],
    ['            ','    ____    ',' n |·  ·| n ',' |_|    |_| ','   |    |   '],
    [' n        n ',' |  ____  | ',' | |·  ·| | ',' |_|    |_| ','   |    |   '],
  ],
  robot: [
    ['            ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------\u00b4  '],
    ['            ','   .[||].   ','  [ ·  · ]  ','  [ -==- ]  ','  `------\u00b4  '],
    ['     *      ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------\u00b4  '],
  ],
  rabbit: [
    ['            ','   (\\__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],
    ['            ','   (|__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],
    ['            ','   (\\__/)   ','  ( ·  · )  ',' =( .  . )= ','  (")__(")  '],
  ],
  mushroom: [
    ['            ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   '],
    ['            ',' .-O-oo-O-. ','(__________)','   |·  ·|   ','   |____|   '],
    ['   . o  .   ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   '],
  ],
  chonk: [
    ['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4  '],
    ['            ','  /\\    /|  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4  '],
    ['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4~ '],
  ],
}

// ─── Speech phrases ────────────────────────────────────────────────────────────
// prettier-ignore
const BUDDY_PHRASES: Record<string, string[]> = {
  duck:     ['quack!', 'QUACK',  'quack?', '...'],
  goose:    ['HONK!!', 'HONK',   'honk~',  'honk?'],
  blob:     ['bloop~', 'glorp',  '...',    'bloop?'],
  cat:      ['meow',   'mrrrow', 'purr~',  '...'],
  dragon:   ['RAWR!',  'grrr',   '...',    'rawr?'],
  octopus:  ['splsh!', 'ink!',   'hi!',    '...'],
  owl:      ['hoo?',   'HOO!',   'hmm',    '...'],
  penguin:  ['brrr!',  'waddle', 'brr?',   '...'],
  turtle:   ['...',    'slow~',  'hmm',    'yep'],
  snail:    ['slurp',  '...',    'heyyy',  'hi~'],
  ghost:    ['BOO!',   'wooo~',  'boo?',   '...'],
  axolotl:  ['hi~',   ':)',     '...',    'helo!'],
  capybara: ['...',    '*chew*', 'munch',  'ok'],
  cactus:   ['ouch!',  '...',    'poke!',  'hi!'],
  robot:    ['beep',   'boop!',  '01010',  'ERR?'],
  rabbit:   ['*hop*',  'hi!',    'boing',  '...'],
  mushroom: ['spore!', '...',    'grow~',  'hi!'],
  chonk:    ['*nap*',  'chonk',  'nom',    '...'],
}
const GREET_PHRASES = ['hi!', 'hello!', 'hey!', 'yo!', 'sup?', 'hiya!', ':)']
const BUBBLE_LIFE   = 3.0   // seconds a speech bubble stays visible

// ─── Ground props ──────────────────────────────────────────────────────────────
// Lines are bottom-aligned: last line sits just above the ground platform.
// prettier-ignore
const PROP_TEMPLATES: string[][] = [
  // Pine tree
  ['  *  ', ' /|\\ ', '  |  '],
  // Lamp post
  ['.-.', ' | ', ' | ', ' | '],
  // Bench
  ['_____', '[   ]', ' | | '],
  // Flowers
  ['*~*~*', ' ||| '],
  // Round shrub
  ['(~~~)', '\\___/'],
  // Signpost
  ['.----.', '|    |', "'----'", '  ||  '],
  // Mailbox
  [' .--. ', '(====)', ' [  ] '],
]

interface BuddyState {
  species:      string
  x:            number    // top-left pixel x
  y:            number    // top-left pixel y
  vx:           number    // px/s
  vy:           number    // px/s
  facing:       1 | -1   // 1=right  -1=left (mirrors art)
  onGround:     boolean
  state:         'walk' | 'airborne' | 'pause' | 'greet' | 'sleep'
  timer:         number    // seconds until next state action
  jumpCooldown:  number    // seconds until next jump allowed
  greetCooldown: number    // seconds until this buddy can greet again
  animFrame:     number    // 0–2
  animTimer:     number    // seconds until next animation frame
  greetIdx:      number    // index of buddy being greeted (-1 if none)
  sleepPhase:    number    // drives the floating-z animation
  bubble:        { text: string; life: number } | null
}

interface Platform   { x: number; y: number; w: number }
interface GroundProp { x: number; lines: string[] }
interface Particle   { x: number; y: number; vx: number; vy: number; life: number; ch: string }

// Mirror a single ASCII line so buddies face left
function mirrorLine(line: string): string {
  return line.split('').reverse().map(c => {
    switch (c) {
      case '(': return ')'
      case ')': return '('
      case '[': return ']'
      case ']': return '['
      case '{': return '}'
      case '}': return '{'
      case '<': return '>'
      case '>': return '<'
      case '/': return '\\'
      case '\\': return '/'
      default:  return c
    }
  }).join('')
}

// ─── Scene generators ──────────────────────────────────────────────────────────

function generateCity(cols: number, rows: number): ArtCell[] {
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '))
  function set(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = ch
  }
  function setIfEmpty(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === ' ') grid[r][c] = ch
  }

  // ── Stars ─────────────────────────────────────────────────────────────────────
  for (let r = 1; r < Math.floor(rows * 0.50); r++) {
    for (let c = 0; c < cols; c++) {
      if (c < 12 && r < 8) continue
      const hash = Math.abs(Math.sin(c * 127.3 + r * 311.7))
      if (hash > 0.987) set(r, c, '*')
      else if (hash > 0.982) set(r, c, '.')
    }
  }

  // ── Moon crescent ─────────────────────────────────────────────────────────────
  set(3, 4, '('); set(4, 3, '('); set(5, 4, '(')
  set(3, 5, ')'); set(4, 5, ')'); set(5, 5, ')')
  set(4, 6, '.')

  // ── Organic height profile: three incommensurate waves + per-building noise ──
  function bldH(b: number, n: number, maxH: number, minH: number, seed: number): number {
    const t     = n > 1 ? b / (n - 1) : 0.5
    // Soft edge suppression — edges allowed ~45% of max, not forced to min
    const edge  = 0.45 + 0.55 * (1.0 - Math.pow(Math.abs(2 * t - 1), 2.5))
    // Incommensurate frequencies → jagged, never repeating profile
    const v1    = 0.5 + 0.5 * Math.sin(b * 1.7183 + seed * 2.3)
    const v2    = 0.5 + 0.5 * Math.cos(b * 2.7183 + seed * 1.1 + 0.7)
    const v3    = 0.5 + 0.5 * Math.sin(b * 0.9001 + seed * 3.7 + 2.1)
    const noise = Math.abs(Math.sin(b * 73.1 + seed * 5.3 + 1.9))
    const v     = (v1 * 0.30 + v2 * 0.25 + v3 * 0.20 + noise * 0.25) * edge
    return Math.max(minH, Math.round(v * (maxH - minH) + minH))
  }

  // ── Proportional widths with organic variation ────────────────────────────────
  function bldWidths(n: number, seed: number): number[] {
    const raw = Array.from({ length: n }, (_, b) => {
      const a  = 0.4 + 0.8 * Math.abs(Math.sin(b * 41.3 + seed * 3.7))
      const bv = 0.4 + 0.6 * Math.abs(Math.cos(b * 17.9 + seed * 2.1))
      return (a + bv) / 2   // 0.4–1.0
    })
    const sum    = raw.reduce((s, v) => s + v, 0)
    const usable = cols - (n - 1)
    let used     = 0
    return raw.map((v, i) => {
      if (i === n - 1) return Math.max(3, usable - used)
      const w = Math.max(3, Math.round(v / sum * usable))
      used += w
      return w
    })
  }

  // ── Draw one layer of buildings (back-to-front, each overwrites previous) ─────
  // winStyle: 0=dots  1=[o]  2=[H]+accent  3=simple-micro
  function drawLayer(
    baseRow: number, numBlds: number,
    maxH: number, minH: number,
    winStyle: number, layerSeed: number
  ) {
    // Ensure minimum 4 cols per building on narrow viewports
    const n  = Math.min(numBlds, Math.floor((cols + 1) / 4))
    const bw = bldWidths(n, layerSeed)
    let cur  = 0

    for (let b = 0; b < n; b++) {
      const w    = bw[b]
      const bc0  = cur, bc1 = cur + w - 1
      cur += w + 1

      const h    = bldH(b, n, maxH, minH, layerSeed)
      const topR = baseRow - h + 1
      const rs   = (b * 3 + Math.floor(layerSeed * 2.7)) % 5

      // Side walls
      for (let r = topR; r <= baseRow; r++) {
        set(r, bc0, '|')
        if (bc1 > bc0) set(r, bc1, '|')
      }
      // Floor edge
      for (let c = bc0; c <= bc1; c++) set(baseRow, c, '_')

      // Roof (all styles start with flat `_` line)
      for (let c = bc0; c <= bc1; c++) set(topR, c, '_')
      if (rs === 1) {
        // Single antenna
        const mid = Math.floor((bc0 + bc1) / 2)
        set(topR - 1, mid, '|'); set(topR - 2, mid, '-')
      } else if (rs === 2) {
        // Double antenna
        if (w >= 5) {
          const m1 = bc0 + Math.max(1, Math.floor(w / 3))
          const m2 = bc0 + Math.min(w - 2, Math.floor(2 * w / 3))
          set(topR - 1, m1, '|'); set(topR - 2, m1, '|'); set(topR - 3, m1, '-')
          set(topR - 1, m2, '|'); set(topR - 2, m2, '-')
        } else {
          const mid = Math.floor((bc0 + bc1) / 2)
          set(topR - 1, mid, '|'); set(topR - 2, mid, '-')
        }
      } else if (rs === 3) {
        // Stepped crown
        if (w >= 5) {
          const step = Math.max(1, Math.floor(w / 4))
          for (let c = bc0 + step; c <= bc1 - step; c++) set(topR - 1, c, '_')
          const mid = Math.floor((bc0 + bc1) / 2)
          set(topR - 2, mid, '|'); set(topR - 3, mid, 'T')
        }
      } else if (rs === 4) {
        // Water tower
        const mid = Math.floor((bc0 + bc1) / 2)
        if (w >= 6) {
          set(topR - 1, mid - 1, '('); set(topR - 1, mid, '_'); set(topR - 1, mid + 1, ')')
          set(topR - 2, mid, '|')
        } else {
          set(topR - 1, mid, 'T')
        }
      }

      // Windows
      const wseed = b * 17.3 + layerSeed * 7.9
      for (let r = topR + 1; r < baseRow; r++) {
        for (let c = bc0 + 1; c < bc1; c++) {
          const lc  = c - bc0 - 1, lr = r - topR - 1
          const lit = Math.abs(Math.sin(c * 53.7 + r * 97.3 + wseed))
          if (winStyle === 0) {
            // Dot windows — distant, thin buildings
            if (lc % 2 === 0 && lr % 2 === 0) set(r, c, lit > 0.35 ? '.' : ':')
          } else if (winStyle === 1) {
            // [o] — main skyline
            if (lr % 3 < 2) {
              if      (lc % 4 === 0) set(r, c, '[')
              else if (lc % 4 === 1) set(r, c, lit > 0.50 ? 'o' : ' ')
              else if (lc % 4 === 2) set(r, c, ']')
            }
          } else if (winStyle === 2) {
            // [H] + =|= accent — near/mid layer
            if (lr % 3 < 2) {
              if      (lc % 4 === 0) set(r, c, '[')
              else if (lc % 4 === 1) set(r, c, lit > 0.45 ? 'H' : ' ')
              else if (lc % 4 === 2) set(r, c, ']')
            } else {
              setIfEmpty(r, c, lc % 2 === 0 ? '=' : '|')
            }
          } else {
            // Simple dots — micro foreground
            if (lc % 3 === 1 && lr % 2 === 0) set(r, c, lit > 0.5 ? 'o' : ' ')
          }
        }
      }
    }
  }

  // ─── Four layers, back → front ────────────────────────────────────────────────
  //
  // Geometry at rows=40:
  //   Sky (stars+moon):                 rows  1–11  untouched
  //   Distant (narrow, dots):  base=20  tops ~12    peeks above main
  //   Main skyline ([o]):      base=27  tops ~16    tallest buildings
  //   Near ([H], shorter):     base=33  tops ~26    in front of main
  //   Micro foreground (dots): base=38  tops ~35    tiny shops at street
  //   Ground:                           row  39

  // Distant: many narrow buildings peeking above the main skyline
  drawLayer(Math.floor(rows * 0.50), 18,
    Math.floor(rows * 0.22), 2, 0, 5.0)

  // Main skyline: signature tall buildings, irregularly varying heights
  drawLayer(Math.floor(rows * 0.68), 10,
    Math.floor(rows * 0.30), 4, 1, 12.0)

  // Near: noticeably shorter — adds foreground-depth contrast with main
  drawLayer(Math.floor(rows * 0.84), 9,
    Math.floor(rows * 0.18), 3, 2, 23.0)

  // Micro foreground: tiny low-rises / shops right at street level
  drawLayer(rows - 2, 13,
    Math.floor(rows * 0.10), 2, 3, 31.0)

  // ── Ground ────────────────────────────────────────────────────────────────────
  for (let c = 0; c < cols; c++) set(rows - 1, c, '_')

  // ── Street lights ─────────────────────────────────────────────────────────────
  for (let c = 8; c < cols - 2; c += 20) {
    set(rows - 2, c, '-'); set(rows - 2, c + 1, 'T'); set(rows - 2, c + 2, '-')
    set(rows - 3, c + 1, '|'); set(rows - 4, c + 1, '|')
  }

  const cells: ArtCell[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] !== ' ') cells.push({ col: c, row: r, ch: grid[r][c] })
  return cells
}

function generateBeach(cols: number, rows: number): ArtCell[] {
  // ── The Great Wave — Hokusai style, with stickman surfer ─────────────────────
  //
  // Canvas mask: fades in rows*0.10→0.28, opaque 0.28→0.72, fades out 0.72→0.92
  //
  // Wave is a contained shape in the LEFT-CENTER of the canvas:
  //   crest at rows*0.36 (well inside visible zone)
  //   base  at rows*0.66 (still visible)
  //   width: cols*0.02 → cols*0.60 (left 60%)
  // Fuji sits upper-right, visible in clear sky.

  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '))
  function set(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = ch
  }
  function setIfEmpty(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === ' ') grid[r][c] = ch
  }

  // ── Wave dimensions (simplified for layout iteration) ─────────────────────────
  // Visible mask band: rows*0.28–0.72. Wave sits squarely inside it.
  const peakR  = Math.floor(rows * 0.37)   // top of crest
  const baseR  = Math.floor(rows * 0.63)   // bottom of wave
  const waveH  = Math.max(1, baseR - peakR)

  const leftC  = Math.floor(cols * 0.06)   // left tip
  const crestR = Math.floor(cols * 0.46)   // right extent of crest
  const footR  = Math.floor(cols * 0.54)   // right foot at base
  // Alias for Fuji section below
  const waveBaseR = baseR

  // Left wall: steep quadratic
  function edgeL(r: number): number {
    if (r <= peakR) return leftC
    if (r >= baseR) return 0
    const t = (baseR - r) / waveH
    return Math.round(leftC * t * t)
  }

  // Right slope: linear widening
  function edgeR(r: number): number {
    if (r <= peakR) return crestR
    if (r >= baseR) return footR
    const t = (r - peakR) / waveH
    return Math.round(crestR + (footR - crestR) * t)
  }

  // Hollow curl in the top-left (for the future surfer)
  const hollowBot = peakR + Math.floor(waveH * 0.45)
  function isHollow(r: number, c: number): boolean {
    if (r <= peakR || r > hollowBot) return false
    const t      = (r - peakR) / Math.max(1, hollowBot - peakR)
    const hRight = Math.floor(crestR * 0.52 - t * crestR * 0.12)
    return c > leftC + 1 && c < hRight
  }

  // ── Wave body ─────────────────────────────────────────────────────────────────
  for (let r = peakR; r <= baseR; r++) {
    const l = edgeL(r), ri = edgeR(r)
    for (let c = l; c <= ri; c++) {
      if (isHollow(r, c)) continue
      const margin = Math.min(c - l, ri - c)
      set(r, c, margin <= 1 ? '#' : margin <= 4 ? 'W' : '~')
    }
  }

  // ── Crest foam line ───────────────────────────────────────────────────────────
  for (let c = leftC; c <= crestR; c++) {
    setIfEmpty(peakR, c, c % 4 === 0 ? '^' : '~')
  }

  // ── 3 foam claw tips above the crest ─────────────────────────────────────────
  const span = crestR - leftC
  for (let i = 0; i < 3; i++) {
    const bc = leftC + Math.floor(span * (0.18 + i * 0.32))
    for (let j = 0; j < 3; j++) {
      const r = peakR - 1 - j
      setIfEmpty(r, bc + Math.min(j, 1),     '~')
      setIfEmpty(r, bc + Math.min(j, 1) + 1, j === 0 ? '^' : '`')
    }
  }

  // ── Mount Fuji (upper right) ──────────────────────────────────────────────────
  const fujiPeakR = Math.floor(rows * 0.14)
  const fujiPeakC = Math.floor(cols * 0.80)
  const fujiBaseR = Math.floor(rows * 0.40)
  const fujiHW    = Math.floor((fujiBaseR - fujiPeakR) * 0.78)
  const fujiSnowR = fujiPeakR + Math.floor((fujiBaseR - fujiPeakR) * 0.28)
  for (let r = fujiPeakR; r <= fujiBaseR; r++) {
    const t  = (r - fujiPeakR) / (fujiBaseR - fujiPeakR)
    const hw = Math.floor(fujiHW * t)
    for (let c = fujiPeakC - hw; c <= fujiPeakC + hw; c++) {
      if (c === fujiPeakC - hw)       setIfEmpty(r, c, '\\')
      else if (c === fujiPeakC + hw)  setIfEmpty(r, c, '/')
      else if (r <= fujiSnowR)        setIfEmpty(r, c, '*')
      else                            setIfEmpty(r, c, '.')
    }
  }

  // ── Foreground sea (below wave base) ──────────────────────────────────────────
  for (let r = waveBaseR + 1; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const v = (Math.sin(c * 0.5 + r * 1.1) + Math.cos(c * 0.3 + r * 0.7 + 1.3)) / 2
      if (v > 0.50)      setIfEmpty(r, c, '~')
      else if (v > 0.20) setIfEmpty(r, c, '-')
    }
  }
  for (let c = 0; c < cols; c++) set(rows - 1, c, '~')

  const cells: ArtCell[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] !== ' ') cells.push({ col: c, row: r, ch: grid[r][c] })
  return cells
}

// ─── Stateful mode types ────────────────────────────────────────────────────────
interface RainCol {
  leadY:    number
  speed:    number
  trailLen: number
}

interface ConstellationStar {
  x: number; y: number
  vx: number; vy: number
  tx: number; ty: number
  ch: string
  free: boolean
  rate: number
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props { mode: FieldMode }

export default function SignalField({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const isDarkRef = useRef(false)
  const modeRef   = useRef<FieldMode>(mode)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => { isDarkRef.current = resolvedTheme === 'dark' }, [resolvedTheme])
  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const el  = canvas as HTMLCanvasElement
    const c2d = ctx    as CanvasRenderingContext2D

    let W = 0, H = 0, cols = 0, rows = 0, animId = 0
    let prevMode: FieldMode = modeRef.current

    // ── Mode state ─────────────────────────────────────────────────────────────
    let rainCols:     RainCol[]             = []
    let conStars:     ConstellationStar[]   = []
    let conLastSwitch = 0
    let buddies:      BuddyState[]          = []
    let platforms:    Platform[]            = []
    let groundProps:  GroundProp[]          = []
    let particles:    Particle[]            = []

    // ── Shooting stars (city mode) ─────────────────────────────────────────────
    let shootStars: Array<{ x: number; y: number; vx: number; vy: number; bright: number }> = []
    let cityBursts: Particle[] = []
    let shootTimer  = 0

    // ── Buddy pixel dimensions (used in physics, hit-testing, and rendering) ──
    const BW = 84         // approx rendered width of a 12-char buddy line
    const BH = 5 * CELL_H // total sprite height (5 lines × CELL_H px)

    // ── Drag state ─────────────────────────────────────────────────────────────
    let dragIdx  = -1   // index of buddy being dragged  (-1 = none)
    let dragOffX = 0    // cursor-x minus buddy.x at drag start
    let dragOffY = 0    // cursor-y minus buddy.y at drag start
    // Short position history for throw-velocity calculation on release
    const dragHistory: Array<{ x: number; y: number; t: number }> = []

    // Scene cache – invalidated on resize
    let cachedCity:  ArtCell[] | null = null
    let cachedBeach: ArtCell[] | null = null

    function invalidateSceneCache() {
      cachedCity  = null
      cachedBeach = null
    }

    // ── Init functions ──────────────────────────────────────────────────────────
    function initRain() {
      rainCols = Array.from({ length: cols }, () => ({
        leadY:    Math.random() * rows,
        speed:    7 + Math.random() * 10,
        trailLen: 5 + Math.floor(Math.random() * 8),
      }))
    }

    // City mode: spring-physics stars converge to city scene only (no switching)
    function initCity(now: number) {
      invalidateSceneCache()
      conLastSwitch = now
      shootStars = []
      shootTimer = 1 + Math.random() * 3   // first star appears quickly
      if (!cachedCity) cachedCity = generateCity(cols, rows)
      const scene = cachedCity
      conStars = scene.map(cell => ({
        x:    Math.random() * W,
        y:    Math.random() * H,
        vx:   (Math.random() - 0.5) * 2,
        vy:   (Math.random() - 0.5) * 2,
        tx:   cell.col * CELL_W,
        ty:   cell.row * CELL_H,
        ch:   cell.ch,
        free: false,
        rate: 0.010 + Math.random() * 0.006,
      }))
    }

    // ── Platform layout (relative to W × H, recomputed on resize) ───────────────
    // Ground sits near true viewport bottom; elevated tiers are spaced ≤112 px
    // apart so buddies can always jump between them (max jump height ≈ 126 px).
    function setupPlatforms() {
      platforms = [
        // Ground — full width, near true viewport bottom
        { x: 0,                    y: Math.floor(H * 0.88), w: W },
        // Lower tier  (~112 px above ground)
        { x: Math.floor(W * 0.02), y: Math.floor(H * 0.74), w: Math.floor(W * 0.22) },
        { x: Math.floor(W * 0.62), y: Math.floor(H * 0.74), w: Math.floor(W * 0.20) },
        // Mid tier    (~112 px above lower)
        { x: Math.floor(W * 0.22), y: Math.floor(H * 0.60), w: Math.floor(W * 0.22) },
        { x: Math.floor(W * 0.44), y: Math.floor(H * 0.60), w: Math.floor(W * 0.18) },
        { x: Math.floor(W * 0.76), y: Math.floor(H * 0.60), w: Math.floor(W * 0.16) },
        // High perches (~112 px above mid)
        { x: Math.floor(W * 0.08), y: Math.floor(H * 0.46), w: Math.floor(W * 0.18) },
        { x: Math.floor(W * 0.40), y: Math.floor(H * 0.46), w: Math.floor(W * 0.16) },
        { x: Math.floor(W * 0.74), y: Math.floor(H * 0.46), w: Math.floor(W * 0.18) },
      ]
    }

    // Scatter decorative props evenly along the ground platform.
    function setupGroundProps() {
      if (platforms.length === 0) return
      const positions = [0.06, 0.17, 0.30, 0.47, 0.63, 0.77, 0.91]
      groundProps = positions.map((frac, i) => ({
        x:     Math.floor(W * frac),
        lines: PROP_TEMPLATES[i % PROP_TEMPLATES.length],
      }))
    }

    function initBots() {
      setupPlatforms()
      setupGroundProps()
      particles = []
      const SPECIES  = Object.keys(BUDDY_BODIES)
      const COUNT    = Math.min(12, SPECIES.length)
      const shuffled = [...SPECIES].sort(() => Math.random() - 0.5)
      // Exclude ground platform for initial placement (index 0)
      const spawnPlats = platforms.slice(1)
      buddies = Array.from({ length: COUNT }, (_, i) => {
        const plat = spawnPlats[i % spawnPlats.length]
        const xPos = plat.x + Math.random() * Math.max(0, plat.w - BW)
        const yPos = plat.y - BH
        return {
          species:      shuffled[i % shuffled.length],
          x:            xPos,
          y:            yPos,
          vx:           0,
          vy:           0,
          facing:       (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          onGround:     true,
          state:        'walk' as const,
          timer:        Math.random() * 3,
          jumpCooldown:  Math.random() * 2,
          greetCooldown: 0,
          animFrame:     Math.floor(Math.random() * 3),
          animTimer:     Math.random() * 0.5,
          greetIdx:      -1,
          sleepPhase:    0,
          bubble:        null,
        }
      })
    }

    // ── Resize ──────────────────────────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1
      W = window.innerWidth
      H = window.innerHeight
      cols = Math.ceil(W / CELL_W) + 1
      rows = Math.ceil(H / CELL_H) + 1
      el.width  = Math.round(W * dpr)
      el.height = Math.round(H * dpr)
      el.style.width  = `${W}px`
      el.style.height = `${H}px`
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      const now = performance.now()
      const m   = modeRef.current
      if (m === 'rain') initRain()
      if (m === 'city') initCity(now)
      if (m === 'surf') { invalidateSceneCache() }
      if (m === 'bots') initBots()
      else { setupPlatforms(); setupGroundProps() }  // keep layout in sync on resize
    }
    resize()

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      if (dragIdx >= 0) {
        dragHistory.push({ x: e.clientX, y: e.clientY, t: performance.now() })
        if (dragHistory.length > 6) dragHistory.shift()
      }
    }
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }

    const onMouseDown = (e: MouseEvent) => {
      if (modeRef.current !== 'bots') return
      const mx = e.clientX, my = e.clientY
      for (let i = 0; i < buddies.length; i++) {
        const b = buddies[i]
        if (mx >= b.x && mx <= b.x + BW && my >= b.y && my <= b.y + BH) {
          dragIdx  = i
          dragOffX = mx - b.x
          dragOffY = my - b.y
          dragHistory.length = 0
          dragHistory.push({ x: mx, y: my, t: performance.now() })
          b.state = 'airborne'
          b.vx = 0; b.vy = 0
          e.preventDefault()   // suppress text selection during drag
          break
        }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (dragIdx < 0) return
      const b = buddies[dragIdx]
      // Compute throw velocity from recent drag history
      if (dragHistory.length >= 2) {
        const oldest  = dragHistory[0]
        const newest  = dragHistory[dragHistory.length - 1]
        const elapsed = (newest.t - oldest.t) / 1000
        if (elapsed > 0) {
          b.vx = Math.max(-700, Math.min(700, (newest.x - oldest.x) / elapsed))
          b.vy = Math.max(-700, Math.min(700, (newest.y - oldest.y) / elapsed))
        }
      }
      b.state = 'airborne'
      dragIdx = -1
      dragHistory.length = 0
      document.body.style.cursor = ''
    }

    window.addEventListener('resize',     resize,       { passive: true })
    window.addEventListener('mousemove',  onMouseMove,  { passive: true })
    window.addEventListener('mouseleave', onMouseLeave, { passive: true })
    window.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mouseup',    onMouseUp)

    // Pre-allocated buckets for field modes
    const buckets: Array<Array<{ x: number; y: number }>> =
      Array.from({ length: 9 }, () => [])

    const start = performance.now()
    let lastFrameTime = start

    // ── Draw: density / waves ───────────────────────────────────────────────────
    function drawField(t: number) {
      const mx     = mouseRef.current.x
      const my     = mouseRef.current.y
      const dark   = isDarkRef.current
      const m      = modeRef.current
      const ramp   = m === 'waves' ? WAVES_RAMP : DENSITY_RAMP
      const field  = m === 'waves' ? wavesField  : densityField
      const alphas = dark ? DARK_ALPHA : LIGHT_ALPHA

      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'
      for (const b of buckets) b.length = 0

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * CELL_W
          const cy = row * CELL_H
          let v = field(cx / W, cy / H, t)
          const dx = (cx - mx) / 180
          const dy = (cy - my) / 180
          v += Math.exp(-(dx * dx + dy * dy) * 0.5) * 1.5
          const idx = toRampIdx(v)
          if (idx > 0) buckets[idx].push({ x: cx, y: cy })
        }
      }
      for (let i = 1; i < ramp.length; i++) {
        if (buckets[i].length === 0) continue
        c2d.fillStyle = dark
          ? `rgba(255,255,255,${alphas[i]})`
          : `rgba(30,30,30,${alphas[i]})`
        const ch = ramp[i]
        for (const { x, y } of buckets[i]) c2d.fillText(ch, x, y)
      }
    }

    // ── Draw: rain ──────────────────────────────────────────────────────────────
    function drawRain(dt: number) {
      const mx   = mouseRef.current.x
      const my   = mouseRef.current.y
      const dark = isDarkRef.current

      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'

      for (let ci = 0; ci < rainCols.length; ci++) {
        const col = rainCols[ci]
        col.leadY += col.speed * dt

        if (col.leadY - col.trailLen > rows) {
          col.leadY    = -(2 + Math.random() * 8)
          col.speed    = 7 + Math.random() * 10
          col.trailLen = 5 + Math.floor(Math.random() * 8)
        }

        const cx      = ci * CELL_W
        const leadRow = Math.floor(col.leadY)

        for (let i = 0; i <= col.trailLen; i++) {
          const row = leadRow - i
          if (row < 0 || row >= rows) continue

          const cy        = row * CELL_H
          const progress  = 1 - i / col.trailLen
          const baseAlpha = dark
            ? 0.05 + progress * 0.55
            : 0.04 + progress * 0.42

          const mdx   = (cx - mx) / 140
          const mdy   = (cy - my) / 140
          const bloom = Math.exp(-(mdx * mdx + mdy * mdy) * 0.5) * 0.5
          const alpha = Math.min(dark ? 0.92 : 0.72, baseAlpha + bloom)

          const ch = i === 0 ? '@'
                   : i === 1 ? '#'
                   : i < col.trailLen - 2 ? '|'
                   : i < col.trailLen     ? "'"
                   : '.'

          c2d.fillStyle = dark
            ? `rgba(255,255,255,${alpha})`
            : `rgba(30,30,30,${alpha})`
          c2d.fillText(ch, cx, cy)
        }
      }
    }

    // ── Draw: city ──────────────────────────────────────────────────────────────
    // Spring-physics stars converge to city ASCII art. Mouse repels stars.
    // Three alpha passes to minimise fillStyle calls.
    function drawCity(now: number, dt: number) {
      const mx   = mouseRef.current.x
      const my   = mouseRef.current.y
      const dark = isDarkRef.current

      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'

      // Buckets: [far, mid, near]
      type StarRender = { x: number; y: number; ch: string }
      const farBucket:  StarRender[] = []
      const midBucket:  StarRender[] = []
      const nearBucket: StarRender[] = []

      for (const star of conStars) {
        // Spring toward target
        if (!star.free) {
          star.vx += (star.tx - star.x) * star.rate
          star.vy += (star.ty - star.y) * star.rate
        }

        // Mouse repel within 160px
        const mdx = star.x - mx
        const mdy = star.y - my
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < 70 * 70 && md2 > 1) {
          const md    = Math.sqrt(md2)
          const force = (1 - md / 70) * 3
          star.vx += (mdx / md) * force
          star.vy += (mdy / md) * force
        }

        star.vx *= 0.92
        star.vy *= 0.92
        star.x  += star.vx
        star.y  += star.vy

        const col = Math.round(star.x / CELL_W)
        const row = Math.round(star.y / CELL_H)
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue

        const dx   = star.x - star.tx
        const dy   = star.y - star.ty
        const dist = Math.sqrt(dx * dx + dy * dy)

        const px = col * CELL_W
        const py = row * CELL_H

        if (dist < 20) {
          nearBucket.push({ x: px, y: py, ch: star.ch })
        } else if (dist < 80) {
          midBucket.push({ x: px, y: py, ch: '+' })
        } else {
          farBucket.push({ x: px, y: py, ch: '.' })
        }
      }

      // ── Shooting stars — rendered BEFORE city passes so buildings overdraw them,
      //    creating the illusion they fly behind the skyline. ────────────────────
      shootTimer -= dt
      if (shootTimer <= 0) {
        shootTimer = 3 + Math.random() * 7
        const dir   = Math.random() < 0.85 ? 1 : -1
        const speed = 240 + Math.random() * 200
        const angle = (16 + Math.random() * 24) * Math.PI / 180
        shootStars.push({
          x:      dir > 0 ? Math.random() * W * 0.45 : W * (0.55 + Math.random() * 0.5),
          y:      H * 0.04 + Math.random() * H * 0.28,
          vx:     dir * speed * Math.cos(angle),
          vy:     speed * Math.sin(angle),
          bright: 0.55 + Math.random() * 0.35,
        })
      }

      const TRAIL_LEN  = 9
      const TRAIL_STEP = 11
      for (let si = shootStars.length - 1; si >= 0; si--) {
        const s = shootStars[si]
        s.x += s.vx * dt
        s.y += s.vy * dt

        const hitGround = s.y > H * 0.62
        const offScreen = s.x > W + 80 || s.x < -80

        if (hitGround) {
          // Explode — emit burst particles into cityBursts (rendered in front)
          for (let p = 0; p < 13; p++) {
            const a = Math.PI * (0.3 + Math.random() * 1.4)  // upward-biased spread
            const spd2 = p < 4 ? 80 + Math.random() * 110 : 25 + Math.random() * 55
            cityBursts.push({
              x: s.x, y: s.y,
              vx: Math.cos(a) * spd2,
              vy: Math.sin(a) * spd2 - 25,
              life: 1.0,
              ch: p < 4 ? '*' : p < 8 ? "'" : '·',
            })
          }
          shootStars.splice(si, 1); continue
        }
        if (offScreen) { shootStars.splice(si, 1); continue }

        const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
        const nx  = s.vx / spd
        const ny  = s.vy / spd
        c2d.fillStyle = dark ? `rgba(255,255,255,${s.bright})` : `rgba(30,30,30,${s.bright * 0.85})`
        c2d.fillText('*', s.x, s.y)
        for (let j = 1; j <= TRAIL_LEN; j++) {
          const ta = s.bright * (1 - j / TRAIL_LEN) * 0.80
          if (ta < 0.02) continue
          c2d.fillStyle = dark ? `rgba(255,255,255,${ta})` : `rgba(30,30,30,${ta * 0.85})`
          c2d.fillText(j <= 2 ? '-' : '·', s.x - nx * TRAIL_STEP * j, s.y - ny * TRAIL_STEP * j)
        }
      }

      // ── City characters — overdraw shooting stars, placing buildings in front ─
      // Far pass – dim
      if (farBucket.length > 0) {
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(30,30,30,0.09)'
        for (const { x, y, ch } of farBucket) c2d.fillText(ch, x, y)
      }
      // Mid pass – medium
      if (midBucket.length > 0) {
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.32)' : 'rgba(30,30,30,0.24)'
        for (const { x, y, ch } of midBucket) c2d.fillText(ch, x, y)
      }
      // Near pass – bright
      if (nearBucket.length > 0) {
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.62)' : 'rgba(30,30,30,0.48)'
        for (const { x, y, ch } of nearBucket) c2d.fillText(ch, x, y)
      }

      // ── Explosion bursts — rendered AFTER city passes so they appear in front ─
      for (let pi = cityBursts.length - 1; pi >= 0; pi--) {
        const p = cityBursts[pi]
        p.x    += p.vx * dt
        p.y    += p.vy * dt
        p.vy   += 220 * dt   // gravity
        p.life -= dt * 2.0
        if (p.life <= 0) { cityBursts.splice(pi, 1); continue }
        const alpha = (dark ? 0.80 : 0.68) * p.life
        c2d.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(30,30,30,${alpha})`
        c2d.fillText(p.ch, p.x, p.y)
      }
    }

    // ── Draw: surf ───────────────────────────────────────────────────────────────
    // Static wave scene drawn directly — no spring physics.
    function drawSurf() {
      const dark = isDarkRef.current
      if (!cachedBeach) cachedBeach = generateBeach(cols, rows)
      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'
      c2d.fillStyle = dark ? 'rgba(255,255,255,0.48)' : 'rgba(30,30,30,0.40)'
      for (const { col, row, ch } of cachedBeach) {
        c2d.fillText(ch, col * CELL_W, row * CELL_H)
      }
    }

    // ── Draw: bots ─────────────────────────────────────────────────────────────
    // Full platformer physics: gravity, walking, jumping, platform collision.
    function drawBots(dt: number, now: number) {
      const dark    = isDarkRef.current
      const mx      = mouseRef.current.x
      const my      = mouseRef.current.y
      const GRAVITY = 700               // px/s²
      const JUMP_VY = -420              // px/s (upward)
      const WALK_VX = 52               // px/s horizontal
      const MAX_FALL = 500             // terminal velocity px/s
      const GREET   = 120
      const REPEL   = 120
      const eye     = BUDDY_EYES[Math.floor(now / 550) % BUDDY_EYES.length]

      // ── Physics update ──────────────────────────────────────────────────────
      for (let i = 0; i < buddies.length; i++) {
        const b = buddies[i]

        // ── Dragged buddy: skip all physics, follow mouse directly ────────────
        if (dragIdx === i) {
          b.animTimer -= dt
          if (b.animTimer <= 0) { b.animFrame = (b.animFrame + 1) % 3; b.animTimer = 0.25 }
          b.x = mouseRef.current.x - dragOffX
          b.y = mouseRef.current.y - dragOffY
          b.vx = 0; b.vy = 0
          b.onGround = false
          b.state = 'airborne'
          b.sleepPhase = 0
          continue
        }

        // Animate sprite
        b.animTimer -= dt
        if (b.animTimer <= 0) {
          b.animFrame = (b.animFrame + 1) % 3
          b.animTimer = 0.30 + Math.random() * 0.25
        }
        b.jumpCooldown  -= dt
        b.greetCooldown -= dt
        b.timer         -= dt

        // Tick speech bubble lifetime
        if (b.bubble) {
          b.bubble.life -= dt
          if (b.bubble.life <= 0) b.bubble = null
        }

        // Mouse repel (horizontal push, slight upward bump)
        const cx = b.x + BW / 2, cy = b.y + BH / 2
        const mdx = cx - mx, mdy = cy - my
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < REPEL * REPEL && md2 > 1) {
          const md    = Math.sqrt(md2)
          const force = (1 - md / REPEL) * 320
          b.vx += (mdx / md) * force * dt
          b.vy -= (1 - md / REPEL) * 80 * dt   // slight upward nudge
        }

        // ── State machine ────────────────────────────────────────────────────
        if (b.state === 'walk') {
          b.vx = b.facing * WALK_VX
          if (b.timer <= 0) {
            const roll = Math.random()
            if (roll < 0.30 && b.jumpCooldown <= 0 && b.onGround) {
              // Jump!
              b.vy = JUMP_VY
              b.vx = b.facing * WALK_VX * 1.6
              b.state = 'airborne'
              b.jumpCooldown = 2.2
            } else if (roll < 0.55) {
              b.facing = (b.facing === 1 ? -1 : 1)
              b.timer  = 1.5 + Math.random() * 2.5
            } else if (roll < 0.72) {
              b.state = 'pause'; b.timer = 0.6 + Math.random() * 1.2
              // 2% chance to mutter something on entering a pause (keep it rare)
              if (!b.bubble && Math.random() < 0.02) {
                const opts = BUDDY_PHRASES[b.species] ?? ['...']
                b.bubble = { text: opts[Math.floor(Math.random() * opts.length)], life: BUBBLE_LIFE }
              }
            } else {
              b.timer = 1.5 + Math.random() * 3
            }
          }
          // Edge detection — turn or jump at platform edges
          const lookAhead = b.x + b.facing * (BW * 0.7)
          const stayingOn = platforms.some(p =>
            lookAhead > p.x && lookAhead < p.x + p.w &&
            Math.abs((b.y + BH) - p.y) < 6
          )
          if (!stayingOn && b.onGround) {
            if (b.jumpCooldown <= 0 && Math.random() < 0.5) {
              b.vy = JUMP_VY * 0.75; b.vx = b.facing * WALK_VX * 1.4
              b.state = 'airborne'; b.jumpCooldown = 2
            } else {
              b.facing = (b.facing === 1 ? -1 : 1)
              b.timer  = 1 + Math.random() * 2
            }
          }
        } else if (b.state === 'airborne') {
          // Gravity
          b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL)
          // Slight horizontal drag
          b.vx *= 0.995
        } else if (b.state === 'pause') {
          b.vx *= 0.80
          if (b.timer <= 0) {
            // 20% chance to fall asleep instead of resuming walk
            if (Math.random() < 0.20) {
              b.state = 'sleep'
              b.timer = 8 + Math.random() * 10
              b.sleepPhase = 0
            } else {
              b.state = 'walk'
              b.timer = 2 + Math.random() * 3
              if (Math.random() < 0.4) b.facing = (b.facing === 1 ? -1 : 1)
            }
          }
        } else if (b.state === 'sleep') {
          b.vx *= 0.85
          b.sleepPhase += dt * 0.55
          // Wake up if timer expires or mouse repel knocked them significantly
          if (b.timer <= 0 || Math.abs(b.vx) > 60) {
            b.state = 'walk'
            b.timer = 1 + Math.random() * 2
            b.sleepPhase = 0
          }
        } else { // greet
          b.vx *= 0.78
          if (b.onGround) b.vy = 0
          if (b.timer <= 0) {
            const o = buddies[b.greetIdx]
            if (o) b.facing = b.x < o.x ? -1 : 1  // turn away
            b.state = 'walk'; b.timer = 2 + Math.random() * 3; b.greetIdx = -1
          }
        }

        // Apply gravity when airborne (walk/pause/sleep on ground handled above)
        if (!b.onGround && b.state !== 'airborne') {
          b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL)
        }

        // Move
        b.x += b.vx * dt
        b.y += b.vy * dt

        // Horizontal wall bounce
        if (b.x < 0)      { b.x = 0;      b.vx =  Math.abs(b.vx) * 0.6; b.facing =  1 }
        if (b.x + BW > W) { b.x = W - BW; b.vx = -Math.abs(b.vx) * 0.6; b.facing = -1 }
        // Ceiling
        if (b.y < 0)      { b.y = 0; b.vy = Math.abs(b.vy) * 0.4 }

        // ── Platform collision ───────────────────────────────────────────────
        b.onGround = false
        const bCenter = b.x + BW / 2   // use center for overlap — no "hanging off edge"
        for (const plat of platforms) {
          const bBottom = b.y + BH
          if (bCenter > plat.x && bCenter < plat.x + plat.w) {
            if (bBottom >= plat.y && bBottom <= plat.y + Math.abs(b.vy) * dt + CELL_H && b.vy >= 0) {
              b.y = plat.y - BH
              b.vy = b.vy > 120 ? -b.vy * 0.22 : 0   // tiny bounce or stop
              b.onGround = true
              if (b.state === 'airborne') {
                b.state = 'walk'; b.timer = 1 + Math.random() * 2
                // Landing dust — small burst of chars outward from feet
                const DUST_CHARS = ['·', '.', "'"]
                for (let p = 0; p < 5; p++) {
                  const side = p < 3 ? -1 : 1
                  particles.push({
                    x:    b.x + BW / 2 + (Math.random() - 0.5) * BW * 0.5,
                    y:    plat.y - 2,
                    vx:   side * (20 + Math.random() * 50),
                    vy:   -(10 + Math.random() * 30),
                    life: 1.0,
                    ch:   DUST_CHARS[Math.floor(Math.random() * DUST_CHARS.length)],
                  })
                }
              }
              break
            }
          }
        }

        // As soon as a buddy leaves any surface, switch to airborne so gravity
        // applies at full strength — eliminates floating-in-walk-state bug.
        if (!b.onGround && b.state !== 'airborne') {
          if (b.state === 'sleep') b.sleepPhase = 0   // wake up if sleeping
          b.state = 'airborne'
        }
      }

      // ── Greet detection ────────────────────────────────────────────────────
      for (let i = 0; i < buddies.length; i++) {
        for (let j = i + 1; j < buddies.length; j++) {
          const bi = buddies[i], bj = buddies[j]
          if (bi.state === 'greet' || bj.state === 'greet') continue
          if (bi.greetCooldown > 0 || bj.greetCooldown > 0) continue
          const dx = (bi.x + BW / 2) - (bj.x + BW / 2)
          const dy = (bi.y + BH / 2) - (bj.y + BH / 2)
          if (Math.sqrt(dx * dx + dy * dy) < GREET) {
            bi.state = 'greet'; bi.timer = 1.8; bi.greetIdx = j; bi.vx = 0
            bj.state = 'greet'; bj.timer = 1.8; bj.greetIdx = i; bj.vx = 0
            // Long cooldown so the same pair can't immediately re-greet
            bi.greetCooldown = 12 + Math.random() * 8
            bj.greetCooldown = 12 + Math.random() * 8
            // Face each other
            bi.facing = bi.x < bj.x ?  1 : -1
            bj.facing = bj.x < bi.x ?  1 : -1
            // Give each a greeting bubble
            const pick = () => GREET_PHRASES[Math.floor(Math.random() * GREET_PHRASES.length)]
            if (!bi.bubble) bi.bubble = { text: pick(), life: BUBBLE_LIFE }
            if (!bj.bubble) bj.bubble = { text: pick(), life: BUBBLE_LIFE }
          }
        }
      }

      // ── Render ─────────────────────────────────────────────────────────────
      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'

      // Draw platforms — individual fillText calls so CELL_W grid spacing is
      // honoured; a single long string would render at natural font advance width
      // (~7 px) not the 11 px cell, causing the floor to appear short.
      c2d.fillStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(30,30,30,0.13)'
      for (const plat of platforms) {
        const charCount = Math.max(1, Math.floor(plat.w / CELL_W))
        for (let j = 0; j < charCount; j++) {
          c2d.fillText('_', plat.x + j * CELL_W, plat.y)
        }
      }

      // ── Ground props ────────────────────────────────────────────────────────
      if (platforms.length > 0) {
        const gY = platforms[0].y
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.16)'
        for (const prop of groundProps) {
          for (let li = 0; li < prop.lines.length; li++) {
            // Last line sits one cell above the ground platform line
            const py = gY - (prop.lines.length - li) * CELL_H
            c2d.fillText(prop.lines[li], prop.x, py)
          }
        }
      }

      // ── Particles (landing dust) — update then draw behind buddies ──────────
      for (let pi = particles.length - 1; pi >= 0; pi--) {
        const p = particles[pi]
        p.x    += p.vx * dt
        p.y    += p.vy * dt
        p.vy   += 180 * dt   // gentle gravity pull-down
        p.life -= dt * 2.8   // fades out in ~0.36 s
        if (p.life <= 0) { particles.splice(pi, 1); continue }
        const pa = (dark ? 0.55 : 0.45) * p.life
        c2d.fillStyle = dark ? `rgba(255,255,255,${pa})` : `rgba(30,30,30,${pa})`
        c2d.fillText(p.ch, p.x, p.y)
      }

      // ── Buddies ─────────────────────────────────────────────────────────────
      c2d.fillStyle = dark ? 'rgba(255,255,255,0.58)' : 'rgba(30,30,30,0.52)'
      for (const b of buddies) {
        const frames = BUDDY_BODIES[b.species]
        const frame  = frames[b.animFrame % frames.length]
        for (let li = 0; li < frame.length; li++) {
          let line = frame[li].replace(/·/g, eye)
          if (b.facing === -1) line = mirrorLine(line)
          c2d.fillText(line, b.x, b.y + li * CELL_H)
        }
      }

      // ── Sleep z's ───────────────────────────────────────────────────────────
      for (const b of buddies) {
        if (b.state !== 'sleep') continue
        // Three staggered z streams drifting upward — each offset 1/3 of a cycle
        for (let zi = 0; zi < 3; zi++) {
          const phase = ((b.sleepPhase * 0.9) + zi * 0.33) % 1
          const alpha = Math.sin(phase * Math.PI) * (dark ? 0.62 : 0.50)
          if (alpha < 0.02) continue
          const drift = phase * CELL_H * 3
          c2d.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(30,30,30,${alpha})`
          c2d.fillText('z', b.x + BW * 0.60 + zi * 4, b.y - drift)
        }
      }

      // ── Names on hover ──────────────────────────────────────────────────────
      c2d.textAlign = 'center'
      for (const b of buddies) {
        const ndx  = (b.x + BW / 2) - mx
        const ndy  = (b.y + BH / 2) - my
        const dist = Math.sqrt(ndx * ndx + ndy * ndy)
        const na   = Math.max(0, (80 - dist) / 80) * (dark ? 0.60 : 0.50)
        if (na < 0.01) continue
        c2d.fillStyle = dark ? `rgba(255,255,255,${na})` : `rgba(30,30,30,${na})`
        c2d.fillText(b.species, b.x + BW / 2, b.y - CELL_H)
      }
      c2d.textAlign = 'left'

      // ── Speech bubbles ──────────────────────────────────────────────────────
      c2d.textAlign = 'center'
      for (const b of buddies) {
        if (!b.bubble) continue
        const { text, life } = b.bubble
        // Fade in over first 0.25 s, fade out over last 0.5 s
        const fadeIn  = Math.min(1, (BUBBLE_LIFE - life) / 0.25)
        const fadeOut = Math.min(1, life / 0.5)
        const alpha   = (dark ? 0.90 : 0.78) * fadeIn * fadeOut
        if (alpha <= 0) continue

        const dashes = '-'.repeat(text.length + 2)
        const top = '.' + dashes + '.'
        const mid = '| ' + text + ' |'
        const bot = "'" + dashes + "'"

        c2d.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(30,30,30,${alpha})`
        const bx = b.x + BW / 2
        const by = b.y - 4 * CELL_H   // box top is 4 cells above buddy head
        c2d.fillText(top, bx, by)
        c2d.fillText(mid, bx, by + CELL_H)
        c2d.fillText(bot, bx, by + 2 * CELL_H)
        // Tail sits one cell above buddy head, nudged left of centre
        c2d.textAlign = 'left'
        c2d.fillText('\\', bx - 6, by + 3 * CELL_H)
        c2d.textAlign = 'center'
      }
      c2d.textAlign = 'left'  // restore default

      // ── Cursor feedback (grab when hoverable, grabbing while dragging) ──────
      const hx = mouseRef.current.x, hy = mouseRef.current.y
      const wantCursor = dragIdx >= 0
        ? 'grabbing'
        : buddies.some(b => hx >= b.x && hx <= b.x + BW && hy >= b.y && hy <= b.y + BH)
        ? 'grab' : ''
      if (document.body.style.cursor !== wantCursor) document.body.style.cursor = wantCursor
    }

    // ── Main loop ───────────────────────────────────────────────────────────────
    function draw(now: number) {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
      lastFrameTime = now
      const t = (now - start) / 1000
      const m = modeRef.current

      if (m !== prevMode) {
        if (prevMode === 'bots') {
          dragIdx = -1
          dragHistory.length = 0
          particles.length = 0
          document.body.style.cursor = ''
        }
        if (prevMode === 'city') { shootStars = []; cityBursts = [] }
        prevMode = m
        if (m === 'rain') initRain()
        if (m === 'city') initCity(now)
        if (m === 'surf') { invalidateSceneCache() }
        if (m === 'bots') initBots()
      }

      if      (m === 'density' || m === 'waves') drawField(t)
      else if (m === 'rain')                      drawRain(dt)
      else if (m === 'city')                      drawCity(now, dt)
      else if (m === 'surf')                      drawSurf()
      else if (m === 'bots')                      drawBots(dt, now)

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize',     resize)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mouseup',    onMouseUp)
      document.body.style.cursor = ''
    }
  }, [mounted])

  if (!mounted) return null

  // Bots mode: extend the visible band lower so buddies on the ground platform
  // (H*0.88) are fully opaque — fade doesn't start until 90%.
  const maskGrad = mode === 'bots'
    ? 'linear-gradient(to bottom, transparent 8%, black 22%, black 90%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 10%, black 28%, black 72%, transparent 92%)'

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset:    0,
        width:    '100%',
        height:   '100%',
        pointerEvents: 'none',
        zIndex:   1,
        WebkitMaskImage: maskGrad,
        maskImage:       maskGrad,
      }}
    />
  )
}
