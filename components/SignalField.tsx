import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// ─── Modes ─────────────────────────────────────────────────────────────────────
export type FieldMode  = 'density' | 'waves' | 'rain' | 'city' | 'bots'
export type BotEffect  = 'none' | 'rain' | 'stars'
export type BotScene   = 'nature' | 'city'

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
  // blob: [
  // ['            ','   .----.   ','  ( ·  · )  ','  (      )  ','   `----\u00b4   '],
  // ['            ','  .------.  ',' (  ·  ·  ) ',' (        ) ','  `------\u00b4  '],
  // ['            ','    .--.    ','   (·  ·)   ','   (    )   ','    `--\u00b4    '],
  // ],
  cat: [
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")~  '],
    ['            ','   /\\-/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
  ],
  // dragon: [
  // ['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-\u00b4  '],
  // ['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (        ) ','  `-vvvv-\u00b4  '],
  // ['   ~    ~   ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-\u00b4  '],
  // ],
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
  // chonk: [
  // ['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4  '],
  // ['            ','  /\\    /|  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4  '],
  // ['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------\u00b4~ '],
  // ],
}

// ─── Speech phrases ────────────────────────────────────────────────────────────
// prettier-ignore
const BUDDY_PHRASES: Record<string, string[]> = {
  duck:     ['quack!', 'QUACK',  'quack?', '...'],
  goose:    ['HONK!!', 'HONK',   'honk~',  'honk?'],
  // blob:     ['bloop~', 'glorp',  '...',    'bloop?'],
  cat:      ['meow',   'mrrrow', 'purr~',  '...'],
  // dragon:   ['RAWR!',  'grrr',   '...',    'rawr?'],
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
  // chonk:    ['*nap*',  'chonk',  'nom',    '...'],
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
interface GroundProp { x: number; lines: string[]; platY?: number }
interface Particle   { x: number; y: number; vx: number; vy: number; life: number; ch: string }
interface Portal     { x: number; platY: number; animFrame: number; animTimer: number }

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
  // fract(sin·43758) hash — amplifies tiny input differences, no visible tiling
  function starHash(c: number, r: number, salt: number): number {
    const v = Math.sin(c * 12.9898 + r * 78.233 + salt * 37.719) * 43758.5453
    return v - Math.floor(v)
  }
  for (let r = 1; r < Math.floor(rows * 0.50); r++) {
    for (let c = 0; c < cols; c++) {
      if (c < 12 && r < 8) continue
      const h = starHash(c, r, 0)
      if (h > 0.988) set(r, c, starHash(c, r, 1) > 0.25 ? '*' : '·')
      else if (h > 0.974) set(r, c, '.')
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


// ─── City platform extractor ───────────────────────────────────────────────────
// Mirrors the bldH / bldWidths / drawLayer calls in generateCity so physics
// platforms land exactly on building rooftops in city bots scene.
function generateCityPlatforms(cols: number, rows: number, cellW: number, cellH: number): Platform[] {
  function bldH(b: number, n: number, maxH: number, minH: number, seed: number): number {
    const t     = n > 1 ? b / (n - 1) : 0.5
    const edge  = 0.45 + 0.55 * (1.0 - Math.pow(Math.abs(2 * t - 1), 2.5))
    const v1    = 0.5 + 0.5 * Math.sin(b * 1.7183 + seed * 2.3)
    const v2    = 0.5 + 0.5 * Math.cos(b * 2.7183 + seed * 1.1 + 0.7)
    const v3    = 0.5 + 0.5 * Math.sin(b * 0.9001 + seed * 3.7 + 2.1)
    const noise = Math.abs(Math.sin(b * 73.1 + seed * 5.3 + 1.9))
    const v     = (v1 * 0.30 + v2 * 0.25 + v3 * 0.20 + noise * 0.25) * edge
    return Math.max(minH, Math.round(v * (maxH - minH) + minH))
  }
  function bldWidths(n: number, seed: number): number[] {
    const raw    = Array.from({ length: n }, (_, b) => {
      const a  = 0.4 + 0.8 * Math.abs(Math.sin(b * 41.3 + seed * 3.7))
      const bv = 0.4 + 0.6 * Math.abs(Math.cos(b * 17.9 + seed * 2.1))
      return (a + bv) / 2
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
  function layerPlatforms(baseRow: number, numBlds: number, maxH: number, minH: number, seed: number, minW: number): Platform[] {
    const n   = Math.min(numBlds, Math.floor((cols + 1) / 4))
    const bw  = bldWidths(n, seed)
    let cur   = 0
    const out: Platform[] = []
    for (let b = 0; b < n; b++) {
      const w    = bw[b]
      const h    = bldH(b, n, maxH, minH, seed)
      const topR = baseRow - h + 1
      if (w >= minW) out.push({ x: cur * cellW, y: topR * cellH, w: w * cellW })
      cur += w + 1
    }
    return out
  }

  return [
    // Street — full-width ground at the near-layer base row
    { x: 0, y: Math.floor(rows * 0.84) * cellH, w: cols * cellW },
    // Near building rooftops (≥4 cols wide — fits a buddy)
    ...layerPlatforms(Math.floor(rows * 0.84), 9,  Math.floor(rows * 0.18), 3, 23.0, 4),
    // Main skyline high perches (only wide buildings ≥6 cols)
    ...layerPlatforms(Math.floor(rows * 0.68), 10, Math.floor(rows * 0.30), 4, 12.0, 6),
  ]
}

// ─── Nature platform generator ────────────────────────────────────────────────
// Three-tier invisible terrain: upper ridge → mid ridge → ground.
// Each tier has deliberate horizontal gaps so buddies can fall through to the
// next tier via staircase connectors placed in those gaps. This gives buddies a
// natural circulation path: they accumulate uphill, then eventually descend.
//
// Layout (% of screen width):
//   Upper:   [1-25%] gap [67-75%] gap [75-99%]   ← two far-side segments
//   Mid:     gap [27-73%] gap                     ← one wide center
//   Steps A: left gap → mid → left mid-gap → ground
//   Steps B: right gap → mid → right mid-gap → ground
function generateNaturePlatforms(cols: number, rows: number, cellW: number, cellH: number): Platform[] {
  const H  = rows * cellH
  const W  = cols * cellW
  const ch = cellH

  const pf: Platform[] = [{ x: 0, y: Math.floor(H * 0.88), w: W }]

  if (W < 640) return pf  // mobile: ground only

  // ── Upper ridge — two far-side segments ────────────────────────────────────
  // Gaps at ~25-67% (center) let buddies rain down to the staircase steps.
  // Slight height variation between segments creates a rolling-hill silhouette.
  const uY = Math.floor(rows * 0.60) * ch
  pf.push({ x: Math.floor(W * 0.01), y: uY - ch,  w: Math.floor(W * 0.24) })  // left:  1–25%
  pf.push({ x: Math.floor(W * 0.75), y: uY,        w: Math.floor(W * 0.24) })  // right: 75–99%

  // ── Mid ridge — one wide central platform ──────────────────────────────────
  // Positioned so its left edge (~27%) aligns with descent-A exit and its
  // right edge (~73%) aligns with descent-B exit.
  const mY = Math.floor(rows * 0.76) * ch
  pf.push({ x: Math.floor(W * 0.27), y: mY,        w: Math.floor(W * 0.46) })  // center: 27–73%

  // ── Descent A — left-side staircase (upper → mid → ground) ────────────────
  // Catches buddies falling off upper-left (ends ~25%), steps them right-down
  // to mid-center (~27%), then again off mid-center left (~27%) to ground.
  pf.push({ x: Math.floor(W * 0.25), y: Math.floor(H * 0.67), w: Math.floor(W * 0.09) })  // 25–34%
  pf.push({ x: Math.floor(W * 0.32), y: Math.floor(H * 0.72), w: Math.floor(W * 0.08) })  // 32–40% → lands on mid-center
  pf.push({ x: Math.floor(W * 0.13), y: Math.floor(H * 0.82), w: Math.floor(W * 0.15) })  // 13–28% → catches mid-left exit
  pf.push({ x: Math.floor(W * 0.04), y: Math.floor(H * 0.86), w: Math.floor(W * 0.10) })  // 4–14%  → falls to ground

  // ── Descent B — right-side staircase (upper → mid → ground) ───────────────
  // Catches buddies falling off upper-right (starts ~75%), steps them left-down
  // to mid-center (~73%), then again off mid-center right (~73%) to ground.
  pf.push({ x: Math.floor(W * 0.66), y: Math.floor(H * 0.67), w: Math.floor(W * 0.09) })  // 66–75%
  pf.push({ x: Math.floor(W * 0.58), y: Math.floor(H * 0.72), w: Math.floor(W * 0.09) })  // 58–67% → lands on mid-center
  pf.push({ x: Math.floor(W * 0.72), y: Math.floor(H * 0.82), w: Math.floor(W * 0.15) })  // 72–87% → catches mid-right exit
  pf.push({ x: Math.floor(W * 0.85), y: Math.floor(H * 0.86), w: Math.floor(W * 0.10) })  // 85–95% → falls to ground

  return pf
}

// ─── Nature scene generator ────────────────────────────────────────────────────
function generateNature(cols: number, rows: number): ArtCell[] {
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '))
  function set(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = ch
  }
  function setIfEmpty(r: number, c: number, ch: string) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === ' ') grid[r][c] = ch
  }
  // Same fract-sin hash used for city stars, different salts → different pattern
  function fh(c: number, r: number, s: number): number {
    const v = Math.sin(c * 12.9898 + r * 78.233 + s * 37.719) * 43758.5453
    return v - Math.floor(v)
  }

  // ── Stars ────────────────────────────────────────────────────────────────────
  for (let r = 1; r < Math.floor(rows * 0.44); r++) {
    for (let c = 0; c < cols; c++) {
      if (c < 8 && r < 7) continue
      const hv = fh(c, r, 7)   // salt 7 → different layout from city stars
      if      (hv > 0.988) set(r, c, fh(c, r, 8) > 0.3 ? '*' : '·')
      else if (hv > 0.974) set(r, c, '.')
    }
  }

  // ── Crescent moon (upper-left; city puts it upper-right) ─────────────────────
  set(2, 4, '('); set(2, 5, ')')
  set(3, 3, '('); set(3, 5, ')'); set(3, 6, '.')
  set(4, 4, '('); set(4, 5, ')')

  // ── Mountain helper ──────────────────────────────────────────────────────────
  // Draws a filled triangular peak: '^' tip, '/' '\' slopes, ':' snow, '.' rock
  function drawPeak(cx: number, baseR: number, h: number, snowRows: number) {
    for (let i = 0; i <= h; i++) {
      const r = baseR - h + i
      if (r < 0 || r >= rows) continue
      if (i === 0) {
        set(r, cx, '^')
      } else {
        set(r, cx - i, '/')
        set(r, cx + i, '\\')
        for (let x = cx - i + 1; x < cx + i; x++) {
          if (i <= snowRows)            set(r, x, ':')
          else if (fh(x, r, 99) > 0.6) set(r, x, '.')   // sparse rock texture
        }
      }
    }
  }

  // ── Distant mountains ────────────────────────────────────────────────────────
  const farBase = Math.floor(rows * 0.54)
  const farN    = 7
  for (let i = 0; i < farN; i++) {
    const cx = Math.floor((i + 0.4 + fh(i, 0, 22) * 0.2) / farN * cols)
    const h  = 3 + Math.floor(fh(i, 0, 23) * Math.floor(rows * 0.10))
    drawPeak(cx, farBase, h, 0)
  }

  // ── Main mountains ───────────────────────────────────────────────────────────
  const mtnBase = Math.floor(rows * 0.67)
  const mtnN    = 4 + Math.floor(fh(0, 0, 31) * 2)
  for (let i = 0; i < mtnN; i++) {
    const cx   = Math.floor((i + 0.4 + fh(i, 0, 32) * 0.2) / mtnN * cols)
    const minH = Math.floor(rows * 0.12)
    const maxH = Math.floor(rows * 0.24)
    const h    = minH + Math.floor(fh(i, 0, 33) * (maxH - minH))
    drawPeak(cx, mtnBase, h, Math.max(0, Math.floor(h * 0.28)))
  }

  // ── Valley floor / meadow ────────────────────────────────────────────────────
  // Fills the space between the mountain bases and the tree line so the
  // landscape reads as continuous terrain rather than empty canvas.
  const meadowTop = Math.floor(rows * 0.69)
  const treeBaseForMeadow = Math.floor(rows * 0.81)

  // Rolling hill silhouette — a gentle `~` wave sits just below the near mountains
  for (let c = 0; c < cols; c++) {
    const ripple = Math.sin(c * 0.18 + 2.1) * 1.8 + Math.sin(c * 0.07 + 0.4) * 1.4
    const r = meadowTop + Math.round(ripple)
    setIfEmpty(r, c, '~')
  }

  // Sparse ground texture — density increases from hill line down to trees
  for (let r = meadowTop + 2; r < treeBaseForMeadow; r++) {
    const t = (r - meadowTop) / (treeBaseForMeadow - meadowTop)   // 0 → 1
    for (let c = 0; c < cols; c++) {
      const h = fh(c, r, 61)
      const thresh = 0.90 - t * 0.32   // 0.90 at top → 0.58 near trees
      if (h > thresh) {
        const h2 = fh(c, r, 62)
        setIfEmpty(r, c, h2 > 0.65 ? '\'' : h2 > 0.30 ? ',' : '.')
      }
    }
  }

  // ── Pine trees ───────────────────────────────────────────────────────────────
  const treeBase = Math.floor(rows * 0.81)

  function drawPine(cx: number, h: number) {
    setIfEmpty(treeBase - h, cx, '*')
    for (let i = 1; i <= h; i++) {
      const r = treeBase - h + i
      setIfEmpty(r, cx - i, '/')
      setIfEmpty(r, cx, '|')            // centre spine
      setIfEmpty(r, cx + i, '\\')
    }
    setIfEmpty(treeBase + 1, cx, '|')  // trunk below canopy
  }

  function drawRound(cx: number) {
    setIfEmpty(treeBase - 2, cx - 1, '(')
    setIfEmpty(treeBase - 2, cx,     '~')
    setIfEmpty(treeBase - 2, cx + 1, '~')
    setIfEmpty(treeBase - 2, cx + 2, ')')
    setIfEmpty(treeBase - 1, cx,     '|')
    setIfEmpty(treeBase - 1, cx + 1, '|')
  }

  let tc = 2 + Math.floor(fh(0, 0, 41) * 4)
  while (tc < cols - 6) {
    const roll = fh(tc, 0, 42)
    if (roll > 0.35) {
      const h = 2 + Math.floor(fh(tc, 1, 43) * 3)   // pine, height 2-4
      drawPine(tc + h + 1, h)
      tc += (h + 1) * 2 + 3 + Math.floor(fh(tc, 2, 44) * 4)
    } else if (roll > 0.12) {
      drawRound(tc + 1)
      tc += 6 + Math.floor(fh(tc, 3, 45) * 5)
    } else {
      tc += 2 + Math.floor(fh(tc, 4, 46) * 3)
    }
  }

  // ── Ground line with sparse grass tufts ──────────────────────────────────────
  const groundRow = Math.floor(rows * 0.84)
  for (let c = 0; c < cols; c++) set(groundRow, c, '_')
  for (let c = 1; c < cols - 1; c++) {
    if (fh(c, 0, 51) > 0.72) setIfEmpty(groundRow - 1, c, '\'')
  }

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
interface Props { mode: FieldMode; effect?: BotEffect; scene?: BotScene }

export default function SignalField({ mode, effect, scene }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const isDarkRef  = useRef(false)
  const modeRef    = useRef<FieldMode>(mode)
  const effectRef  = useRef<BotEffect>('none')
  const sceneRef   = useRef<BotScene>('nature')
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => { isDarkRef.current = resolvedTheme === 'dark' }, [resolvedTheme])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { effectRef.current = effect ?? 'none' }, [effect])
  useEffect(() => { sceneRef.current = scene ?? 'nature' }, [scene])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const el  = canvas as HTMLCanvasElement
    const c2d = ctx    as CanvasRenderingContext2D

    let W = 0, H = 0, cols = 0, rows = 0, animId = 0
    // Scaled per viewport — updated in resize() before anything else
    // eslint-disable-next-line no-shadow
    let CELL_W = 11, CELL_H = 18
    // eslint-disable-next-line no-shadow
    let FONT = '12px Menlo, "Courier New", monospace'
    let prevMode:  FieldMode = modeRef.current
    let prevScene: BotScene  = sceneRef.current

    // ── Mode state ─────────────────────────────────────────────────────────────
    let rainCols:     RainCol[]             = []
    let conStars:     ConstellationStar[]   = []
    let conLastSwitch = 0
    let buddies:        BuddyState[]          = []
    let platforms:      Platform[]            = []
    let groundProps:    GroundProp[]          = []
    let particles:      Particle[]            = []
    let portal:         Portal | null         = null
    let portalCooldown: number[]              = []

    // Vertical portal seam — sine-wave shape: ( | ) | cycling creates a flowing curve
    const PORTAL_WAVE = ['(', '|', ')', '|'] as const
    const PORTAL_ROWS = 5    // seam height in cells

    // ── Shooting stars (city mode + night overlay) ────────────────────────────
    let shootStars: Array<{ x: number; y: number; vx: number; vy: number; bright: number }> = []
    let cityBursts: Particle[] = []
    let shootTimer  = 0

    // ── Bots mode overlays ────────────────────────────────────────────────────
    let rainActive:   boolean[]  = []
    let rainCloudRow: number[]   = []   // per-column cloud-bottom row (-1 = no cloud / dark mode)
    let rainSplash:   Particle[] = []
    let prevEffect:  BotEffect  = 'none'

    // ── Sky background (pre-computed on resize) ────────────────────────────────
    type SC = { x: number; y: number; ch: string }
    type SkyCloud = { cells: SC[]; baseX: number; ox: number; vx: number }
    let skyDarkStars:   SC[] = []
    let skyDarkMoon:    SC[] = []
    let skyLightClouds: SkyCloud[] = []
    let skyLightBirds:  SC[] = []
    let skyLightSun:    SC[] = []

    // ── Buddy pixel dimensions (used in physics, hit-testing, and rendering) ──
    let BW = 84         // approx rendered width of a 12-char buddy line
    let BH = 5 * CELL_H // total sprite height (5 lines × CELL_H px)

    // ── Drag state ─────────────────────────────────────────────────────────────
    let dragIdx  = -1   // index of buddy being dragged  (-1 = none)
    let dragOffX = 0    // cursor-x minus buddy.x at drag start
    let dragOffY = 0    // cursor-y minus buddy.y at drag start
    // Short position history for throw-velocity calculation on release
    const dragHistory: Array<{ x: number; y: number; t: number }> = []

    // Scene cache – invalidated on resize
    let cachedCity:        ArtCell[]           | null = null
    let cachedCityPlats:   Platform[]          | null = null
    let cityBgStars:       ConstellationStar[] | null = null
    let cachedNature:      ArtCell[]           | null = null
    let cachedNaturePlats: Platform[]          | null = null
    let natureBgStars:     ConstellationStar[] | null = null

    function invalidateSceneCache() {
      cachedCity        = null
      cachedCityPlats   = null
      cityBgStars       = null
      cachedNature      = null
      cachedNaturePlats = null
      natureBgStars     = null
    }

    function makeBgAnim(cells: ArtCell[]): ConstellationStar[] {
      return cells.map(cell => ({
        x:    Math.random() * W,
        y:    Math.random() * H,
        vx:   (Math.random() - 0.5) * 3,
        vy:   (Math.random() - 0.5) * 3,
        tx:   cell.col * CELL_W,
        ty:   cell.row * CELL_H,
        ch:   cell.ch,
        free: false,
        rate: 0.010 + Math.random() * 0.006,
      }))
    }

    function initCityBgAnim() {
      if (!cachedCity) cachedCity = generateCity(cols, rows)
      const streetRow = Math.floor(rows * 0.84)
      cityBgStars = makeBgAnim(cachedCity.filter(cell => cell.row < streetRow))
    }

    function initNatureBgAnim() {
      if (!cachedNature) cachedNature = generateNature(cols, rows)
      natureBgStars = makeBgAnim(cachedNature)
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
      if (W < 640) {
        // Mobile: ground only — bots walk along the bottom like on a dock
        platforms = [
          { x: 0, y: Math.floor(H * 0.88), w: W },
        ]
      } else {
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
    }

    // Scatter decorative props along the ground (desktop) or elevated platforms (mobile).
    function setupGroundProps() {
      if (platforms.length === 0) { groundProps = []; return }
      if (W < 640) {
        // On mobile: one small prop centered on each elevated platform (skip ground)
        groundProps = platforms.slice(1).map((p, i) => ({
          x:     Math.floor(p.x + p.w / 2) - CELL_W,
          lines: PROP_TEMPLATES[i % PROP_TEMPLATES.length],
          platY: p.y,
        }))
      } else {
        // Four props in two loose pairs, flanking the center
        const positions = [
          0.08 + (Math.random() - 0.5) * 0.06,
          0.18 + (Math.random() - 0.5) * 0.06,
          0.74 + (Math.random() - 0.5) * 0.06,
          0.86 + (Math.random() - 0.5) * 0.06,
        ]
        const shuffledTemplates = [...PROP_TEMPLATES].sort(() => Math.random() - 0.5)
        groundProps = positions.map((frac, i) => ({
          x:     Math.floor(W * frac),
          lines: shuffledTemplates[i % shuffledTemplates.length],
        }))

      }
    }

    function setupPortal() {
      portal = {
        x:         W - CELL_W,               // flush with right wall
        platY:     Math.floor(H * 0.88),      // ground platform y
        animFrame: 0,
        animTimer: 0.38,
      }
    }

    function initBots() {
      if (sceneRef.current === 'city') {
        setupPlatforms()
        setupGroundProps()
        if (!cachedCityPlats) cachedCityPlats = generateCityPlatforms(cols, rows, CELL_W, CELL_H)
        platforms   = cachedCityPlats
        groundProps = []
        initCityBgAnim()
      } else {
        if (!cachedNaturePlats) cachedNaturePlats = generateNaturePlatforms(cols, rows, CELL_W, CELL_H)
        platforms   = cachedNaturePlats
        groundProps = []
        initNatureBgAnim()
      }
      setupPortal()
      initSky()
      particles = []
      const SPECIES  = Object.keys(BUDDY_BODIES)
      const COUNT    = Math.min(W < 640 ? 2 : 6, SPECIES.length)
      const shuffled = [...SPECIES].sort(() => Math.random() - 0.5)
      // Prefer elevated platforms for spawn; fall back to ground if none exist (mobile)
      const spawnPlats = platforms.length > 1 ? platforms.slice(1) : platforms
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
      portalCooldown = new Array(buddies.length).fill(0)
    }

    // ── Stars overlay init ─────────────────────────────────────────────────────
    function initStars() {
      shootStars = []
      cityBursts = []
      shootTimer  = 0.3 + Math.random() * 1.2
    }

    // ── Rain overlay init (sparse light rain for bots scene) ──────────────────
    function initBotsRain() {
      const isDark = document.documentElement.classList.contains('dark')
      // Dark: random columns active from top. Light: all inactive — cloud coverage activates them.
      rainActive   = Array.from({ length: cols }, () => isDark ? Math.random() < 0.55 : false)
      rainCloudRow = new Array(cols).fill(-1)
      rainCols     = Array.from({ length: cols }, () => ({
        leadY:    Math.random() * rows * 1.2 - rows * 0.15,   // stagger: some already falling
        speed:    18 + Math.random() * 16,
        trailLen: 2 + Math.floor(Math.random() * 3),
      }))
      rainSplash = []
    }

    // ── Sky background init ────────────────────────────────────────────────────
    function initSky() {
      skyDarkStars   = []
      skyDarkMoon    = []
      skyLightClouds = []
      skyLightBirds  = []
      skyLightSun    = []

      function pushLines(arr: SC[], ox: number, oy: number, lines: string[]) {
        for (let li = 0; li < lines.length; li++) {
          for (let ci = 0; ci < lines[li].length; ci++) {
            const ch = lines[li][ci]
            if (ch !== ' ') arr.push({ x: ox + ci * CELL_W, y: oy + li * CELL_H, ch })
          }
        }
      }
      function makeCloud(cx: number, cy: number, lines: string[], vx: number): SkyCloud {
        const cells: SC[] = []
        pushLines(cells, cx, cy, lines)
        return { cells, baseX: cx, ox: 0, vx }
      }

      // Dark: randomly scattered stars — top sky band only, clear of platforms
      for (let i = 0; i < 65; i++) {
        skyDarkStars.push({
          x:  Math.random() * W,
          y:  H * 0.04 + Math.random() * (H * 0.34),  // H*0.04–0.38, above high platforms (H*0.46)
          ch: Math.random() < 0.15 ? '*' : '.',
        })
      }

      // Dark: sliver crescent moon (upper right)
      //   (      ← top arc, offset right
      //  ( .     ← middle bulge, leftmost point + glint
      //   (      ← bottom arc, offset right
      const moonX = Math.floor(W * 0.80), moonY = Math.floor(H * 0.09)
      skyDarkMoon.push({ x: moonX + CELL_W,     y: moonY,              ch: '(' })
      skyDarkMoon.push({ x: moonX,              y: moonY + CELL_H,     ch: '(' })
      skyDarkMoon.push({ x: moonX + CELL_W * 2, y: moonY + CELL_H,     ch: '.' })
      skyDarkMoon.push({ x: moonX + CELL_W,     y: moonY + CELL_H * 2, ch: '(' })

      // Light: clouds — bubbly round style, varied sizes + drift speeds for depth
      // L = large/close (double-bump), M = medium, S = small/distant
      // vx in px/s: slower = feels farther away
      if (W < 640) {
        // Mobile: 3 clouds, all below the bio text (≥ H*0.42)
        skyLightClouds = [
          makeCloud(Math.floor(W * 0.04), Math.floor(H * 0.44), [  // Left — M
            '   ___',
            ' _(   )',
            '(___)__)',
          ], 4),
          makeCloud(Math.floor(W * 0.58), Math.floor(H * 0.42), [  // Right — S
            '  __',
            '_(  )',
            '(_)_)',
          ], -5),
          makeCloud(Math.floor(W * 0.28), Math.floor(H * 0.53), [  // Center-low — M
            '   ___',
            ' _(   )',
            '(___)__)',
          ], 3),
        ]
      } else {
        skyLightClouds = [
          makeCloud(Math.floor(W * 0.02), Math.floor(H * 0.18), [  // Far left, upper — L, slow
            '   ___   __',
            ' _(   )_(  )',
            '(___)___)_)',
          ], 3),                                                     // → right, slow
          makeCloud(Math.floor(W * 0.47), Math.floor(H * 0.17), [  // Upper center-right — M
            '   ___',
            ' _(   )',
            '(___)__)',
          ], -5),                                                    // ← left
          makeCloud(Math.floor(W * 0.08), Math.floor(H * 0.30), [  // Left, mid-sky — M
            '   ___',
            ' _(   )',
            '(___)__)',
          ], 4),                                                     // → right
          makeCloud(Math.floor(W * 0.36), Math.floor(H * 0.28), [  // Center, mid-sky — L
            '   ___   __',
            ' _(   )_(  )',
            '(___)___)_)',
          ], -3),                                                    // ← left, slow
          makeCloud(Math.floor(W * 0.70), Math.floor(H * 0.24), [  // Right, mid-sky — M
            '   ___',
            ' _(   )',
            '(___)__)',
          ], 6),                                                     // → right
          makeCloud(Math.floor(W * 0.83), Math.floor(H * 0.35), [  // Far right, lower — S
            '  __',
            '_(  )',
            '(_)_)',
          ], -8),                                                    // ← left, fastest
        ]
      }

      // Light: birds — -.- style, loosely scattered, clear of platforms
      const birdSpots: Array<[number, number]> = W < 640
        ? [
            [W * 0.72, H * 0.48 + Math.random() * 6],
            [W * 0.12, H * 0.56 + Math.random() * 6],
          ]
        : [
            [W * 0.73, H * 0.20 + Math.random() * 8],
            [W * 0.14, H * 0.35 + Math.random() * 8],
            [W * 0.22, H * 0.38 + Math.random() * 6],
          ]
      for (const [bx, by] of birdSpots) skyLightBirds.push({ x: bx, y: by, ch: '-.-' })
    }

    // ── Resize ──────────────────────────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1
      W = window.innerWidth
      H = window.innerHeight
      // Scale cell size and font down on mobile so ASCII art isn't huge
      CELL_W = W < 640 ? 7  : 11
      CELL_H = W < 640 ? 12 : 18
      FONT   = W < 640 ? '8px Menlo, "Courier New", monospace' : '12px Menlo, "Courier New", monospace'
      BW     = W < 640 ? 56 : 84
      BH     = 5 * CELL_H
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
      if (m === 'bots') {
        cachedCity      = null   // all backdrop caches must regenerate at new dimensions
        cachedCityPlats = null
        cityBgStars     = null
        cachedNature    = null
        natureBgStars   = null
        initBots()
        if (effectRef.current === 'stars') initStars()
        else if (effectRef.current === 'rain') initBotsRain()
      } else {
        setupPlatforms(); setupGroundProps()  // keep layout in sync on resize
      }
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

    const onTouchStart = (e: TouchEvent) => {
      if (modeRef.current !== 'bots') return
      const t = e.touches[0]
      const mx = t.clientX, my = t.clientY
      mouseRef.current = { x: mx, y: my }
      // Expand hit area for fingers on mobile
      const slop = W < 640 ? 24 : 0
      for (let i = 0; i < buddies.length; i++) {
        const b = buddies[i]
        if (mx >= b.x - slop && mx <= b.x + BW + slop &&
            my >= b.y - slop && my <= b.y + BH + slop) {
          dragIdx  = i
          dragOffX = mx - b.x
          dragOffY = my - b.y
          dragHistory.length = 0
          dragHistory.push({ x: mx, y: my, t: performance.now() })
          b.state = 'airborne'
          b.vx = 0; b.vy = 0
          e.preventDefault()
          break
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      const t = e.touches[0]
      mouseRef.current = { x: t.clientX, y: t.clientY }
      if (dragIdx >= 0) {
        dragHistory.push({ x: t.clientX, y: t.clientY, t: performance.now() })
        if (dragHistory.length > 6) dragHistory.shift()
        e.preventDefault()
      }
    }

    const onTouchEnd = () => {
      mouseRef.current = { x: -9999, y: -9999 }
      if (dragIdx < 0) return
      const b = buddies[dragIdx]
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
    }

    window.addEventListener('resize',     resize,       { passive: true })
    window.addEventListener('mousemove',  onMouseMove,  { passive: true })
    window.addEventListener('mouseleave', onMouseLeave, { passive: true })
    window.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mouseup',    onMouseUp)
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    window.addEventListener('touchend',   onTouchEnd)

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

        // Horizontal wall bounce / portal
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.6; b.facing = 1 }
        if (b.x + BW > W) {
          if (portal && b.onGround && portalCooldown[i] <= 0) {
            // Walk into the right-wall portal → fall from sky onto a high platform
            // On mobile the layout is lower, so use the top half of available platforms
            const sorted    = [...platforms].sort((a, b) => a.y - b.y)
            const topHalf   = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)))
            const tgt       = topHalf[Math.floor(Math.random() * topHalf.length)]
            b.x        = tgt.x + Math.random() * Math.max(0, tgt.w - BW)
            b.y        = -(BH + CELL_H * 3)
            b.vx       = (Math.random() - 0.5) * 40
            b.vy       = 60
            b.state    = 'airborne'
            b.onGround = false
            portalCooldown[i] = 8
          } else {
            b.x = W - BW; b.vx = -Math.abs(b.vx) * 0.6; b.facing = -1
          }
        }
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

        // Tick portal cooldown
        if (portalCooldown[i] > 0) portalCooldown[i] -= dt
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

      // ── Portal proximity ───────────────────────────────────────────────────
      // Binary: true only when a ground bot is within a few px of the right wall
      const PROX_DIST = 28   // px from right wall
      let portalProximity = 0
      if (portal) {
        for (const b of buddies) {
          if (!b.onGround) continue
          if (W - (b.x + BW) < PROX_DIST) { portalProximity = 1; break }
        }
      }

      // ── Render ─────────────────────────────────────────────────────────────
      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'

      if (sceneRef.current === 'city') {
        // ── City backdrop — builds in with spring animation, then static ──────
        if (!cachedCity) cachedCity = generateCity(cols, rows)
        const streetRow = Math.floor(rows * 0.84)

        if (cityBgStars) {
          // Spring phase: each cell converges from a random start position
          type SR = { x: number; y: number; ch: string }
          const farBkt:  SR[] = []
          const midBkt:  SR[] = []
          const nearBkt: SR[] = []
          let settled = 0

          for (const star of cityBgStars) {
            star.vx += (star.tx - star.x) * star.rate
            star.vy += (star.ty - star.y) * star.rate
            star.vx *= 0.92
            star.vy *= 0.92
            star.x  += star.vx
            star.y  += star.vy

            const dx   = star.x - star.tx
            const dy   = star.y - star.ty
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 3) settled++

            const col = Math.round(star.x / CELL_W)
            const row = Math.round(star.y / CELL_H)
            if (col < 0 || col >= cols || row < 0 || row >= rows) continue
            const px = col * CELL_W, py = row * CELL_H

            if      (dist < 20) nearBkt.push({ x: px, y: py, ch: star.ch })
            else if (dist < 90) midBkt.push({ x: px, y: py, ch: star.ch })
            else                farBkt.push({ x: px, y: py, ch: star.ch })
          }

          if (farBkt.length  > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(30,30,30,0.05)'
            for (const s of farBkt)  c2d.fillText(s.ch, s.x, s.y)
          }
          if (midBkt.length  > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.13)' : 'rgba(30,30,30,0.09)'
            for (const s of midBkt)  c2d.fillText(s.ch, s.x, s.y)
          }
          if (nearBkt.length > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.15)'
            for (const s of nearBkt) c2d.fillText(s.ch, s.x, s.y)
          }

          // Hand off to static once 95% of cells have converged
          if (settled > cityBgStars.length * 0.95) cityBgStars = null
        } else {
          // Static phase after animation completes
          c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.15)'
          for (const cell of cachedCity) {
            if (cell.row >= streetRow) continue
            c2d.fillText(cell.ch, cell.col * CELL_W, cell.row * CELL_H)
          }
        }
      } else {
        // ── Nature backdrop — spring animation then static ──────────────────
        if (!cachedNature) cachedNature = generateNature(cols, rows)

        if (natureBgStars) {
          type SR = { x: number; y: number; ch: string }
          const farBkt:  SR[] = []
          const midBkt:  SR[] = []
          const nearBkt: SR[] = []
          let settled = 0

          for (const star of natureBgStars) {
            star.vx += (star.tx - star.x) * star.rate
            star.vy += (star.ty - star.y) * star.rate
            star.vx *= 0.92
            star.vy *= 0.92
            star.x  += star.vx
            star.y  += star.vy

            const dx   = star.x - star.tx
            const dy   = star.y - star.ty
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 3) settled++

            const col = Math.round(star.x / CELL_W)
            const row = Math.round(star.y / CELL_H)
            if (col < 0 || col >= cols || row < 0 || row >= rows) continue
            const px = col * CELL_W, py = row * CELL_H

            if      (dist < 20) nearBkt.push({ x: px, y: py, ch: star.ch })
            else if (dist < 90) midBkt.push({ x: px, y: py, ch: star.ch })
            else                farBkt.push({ x: px, y: py, ch: star.ch })
          }

          if (farBkt.length  > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(30,30,30,0.05)'
            for (const s of farBkt)  c2d.fillText(s.ch, s.x, s.y)
          }
          if (midBkt.length  > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.13)' : 'rgba(30,30,30,0.09)'
            for (const s of midBkt)  c2d.fillText(s.ch, s.x, s.y)
          }
          if (nearBkt.length > 0) {
            c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.15)'
            for (const s of nearBkt) c2d.fillText(s.ch, s.x, s.y)
          }

          if (settled > natureBgStars.length * 0.95) natureBgStars = null
        } else {
          c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.15)'
          for (const cell of cachedNature) {
            c2d.fillText(cell.ch, cell.col * CELL_W, cell.row * CELL_H)
          }
        }
      }

      const eff = effectRef.current

      // ── Stars: shooting stars arc behind bots ────────────────────────────────
      if (eff === 'stars') {
        // Shooting star timer + spawn
        shootTimer -= dt
        if (shootTimer <= 0) {
          shootTimer = 1.2 + Math.random() * 2.8
          const count = Math.random() < 0.40 ? 2 : 1   // 40% chance of a pair
          for (let k = 0; k < count; k++) {
            const dir   = Math.random() < 0.85 ? 1 : -1
            const speed = 200 + Math.random() * 150
            const angle = (14 + Math.random() * 22) * Math.PI / 180
            shootStars.push({
              x:      dir > 0 ? Math.random() * W * 0.45 : W * (0.55 + Math.random() * 0.45),
              y:      H * 0.03 + Math.random() * H * 0.22,
              vx:     dir * speed * Math.cos(angle),
              vy:     speed * Math.sin(angle),
              bright: 0.55 + Math.random() * 0.35,
            })
          }
        }
        const TRAIL_LEN  = 8
        const TRAIL_STEP = 11
        for (let si = shootStars.length - 1; si >= 0; si--) {
          const s = shootStars[si]
          s.x += s.vx * dt
          s.y += s.vy * dt
          const hitGround = s.y > H * 0.48
          const offScreen = s.x > W + 80 || s.x < -80
          if (hitGround) {
            for (let p = 0; p < 10; p++) {
              const a    = Math.PI * (0.25 + Math.random() * 1.5)
              const spd2 = p < 3 ? 70 + Math.random() * 90 : 20 + Math.random() * 45
              cityBursts.push({
                x: s.x, y: s.y,
                vx: Math.cos(a) * spd2,
                vy: Math.sin(a) * spd2 - 20,
                life: 1.0,
                ch:   p < 3 ? '*' : p < 6 ? "'" : '·',
              })
            }
            shootStars.splice(si, 1); continue
          }
          if (offScreen) { shootStars.splice(si, 1); continue }
          const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
          const nx  = s.vx / spd, ny = s.vy / spd
          c2d.fillStyle = dark ? `rgba(255,255,255,${s.bright})` : `rgba(30,30,30,${s.bright * 0.85})`
          c2d.fillText('*', s.x, s.y)
          for (let j = 1; j <= TRAIL_LEN; j++) {
            const ta = s.bright * (1 - j / TRAIL_LEN) * 0.75
            if (ta < 0.02) continue
            c2d.fillStyle = dark ? `rgba(255,255,255,${ta})` : `rgba(30,30,30,${ta * 0.85})`
            c2d.fillText(j <= 2 ? '-' : '·', s.x - nx * TRAIL_STEP * j, s.y - ny * TRAIL_STEP * j)
          }
        }
      }

      // Draw platforms — city: nearly invisible street lines; nature: fully hidden
      // (physics still runs on these platforms either way)
      if (sceneRef.current === 'city') {
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(30,30,30,0.03)'
        for (const plat of platforms) {
          const charCount = Math.max(1, Math.floor(plat.w / CELL_W))
          for (let j = 0; j < charCount; j++) {
            c2d.fillText('─', plat.x + j * CELL_W, plat.y)
          }
        }
      }
      // nature: platforms invisible — buddies appear to walk on the terrain

      // ── Ground props — city mode only (lamp posts, benches don't belong in nature)
      if (sceneRef.current === 'city' && platforms.length > 0) {
        const gY = platforms[0].y
        c2d.fillStyle = dark ? 'rgba(255,255,255,0.20)' : 'rgba(30,30,30,0.16)'
        for (const prop of groundProps) {
          const baseY = prop.platY ?? gY
          for (let li = 0; li < prop.lines.length; li++) {
            const py = baseY - (prop.lines.length - li) * CELL_H
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

      // ── Portal — invisible at rest, ripples as a bot approaches ────────────
      if (portal && portalProximity > 0.01) {
        // Animation ticks faster the closer the bot is
        portal.animTimer -= dt * 4
        if (portal.animTimer <= 0) {
          portal.animFrame  = (portal.animFrame + 1) % PORTAL_WAVE.length
          portal.animTimer  = 0.38
        }
        const alpha = dark ? 0.55 : 0.44
        c2d.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(30,30,30,${alpha})`
        for (let r = 0; r < PORTAL_ROWS; r++) {
          const ch = PORTAL_WAVE[(r + portal.animFrame) % PORTAL_WAVE.length]
          const py = portal.platY - (PORTAL_ROWS - r) * CELL_H
          c2d.fillText(ch, portal.x, py)
        }
      }

      // ── Stars: explosion bursts in front of bots ────────────────────────────
      if (eff === 'stars') {
        for (let pi = cityBursts.length - 1; pi >= 0; pi--) {
          const p = cityBursts[pi]
          p.x    += p.vx * dt
          p.y    += p.vy * dt
          p.vy   += 220 * dt
          p.life -= dt * 2.0
          if (p.life <= 0) { cityBursts.splice(pi, 1); continue }
          const alpha = (dark ? 0.80 : 0.68) * p.life
          c2d.fillStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(30,30,30,${alpha})`
          c2d.fillText(p.ch, p.x, p.y)
        }
      }

      // ── Rain: sparse light rain with surface splashes ────────────────────────
      if (eff === 'rain') {
        // Update + render lingering splash chars (in front of bots)
        for (let pi = rainSplash.length - 1; pi >= 0; pi--) {
          const p = rainSplash[pi]
          p.x    += p.vx * dt
          p.y    += p.vy * dt
          p.vy   += 55 * dt    // gentle gravity
          p.life -= dt * 4.5   // quick fade (~0.22 s)
          if (p.life <= 0) { rainSplash.splice(pi, 1); continue }
          const a = (dark ? 0.52 : 0.42) * p.life
          c2d.fillStyle = dark ? `rgba(255,255,255,${a})` : `rgba(30,30,30,${a})`
          c2d.fillText(p.ch, p.x, p.y)
        }

        // Light mode: sync rainActive with current cloud positions each frame
        if (!dark) {
          rainCloudRow.fill(-1)
          for (const cloud of skyLightClouds) {
            let maxY = 0, minX = Infinity, maxX = -Infinity
            for (const cell of cloud.cells) {
              const ax = cell.x + cloud.ox
              if (ax < minX) minX = ax
              if (ax > maxX) maxX = ax
              if (cell.y > maxY) maxY = cell.y
            }
            const bottomRow = Math.floor(maxY / CELL_H) + 5  // ~90px gap beneath cloud
            const c0 = Math.max(0, Math.floor(minX / CELL_W))
            const c1 = Math.min(cols - 1, Math.ceil(maxX / CELL_W))
            for (let c = c0; c <= c1; c++) rainCloudRow[c] = bottomRow
          }
          for (let c = 0; c < cols; c++) {
            if (rainCloudRow[c] >= 0 && !rainActive[c] && Math.random() < 0.40) {
              rainActive[c]      = true
              rainCols[c].leadY  = rainCloudRow[c]
            } else if (rainCloudRow[c] < 0 && rainActive[c]) {
              rainActive[c] = false
            }
          }
        }

        // Update + render rain drops
        for (let ci = 0; ci < rainCols.length; ci++) {
          if (!rainActive[ci]) continue
          const col     = rainCols[ci]
          col.leadY    += col.speed * dt
          const cx      = ci * CELL_W
          const leadPxY = col.leadY * CELL_H

          // Check collision with any platform
          let splashed = false
          for (const plat of platforms) {
            if (cx >= plat.x && cx < plat.x + plat.w &&
                leadPxY >= plat.y - CELL_H && leadPxY <= plat.y + CELL_H) {
              // Spawn a small ground splash
              if (Math.random() < 0.65) {
                for (let s = 0; s < 2; s++) {
                  rainSplash.push({
                    x:    cx + (Math.random() - 0.5) * CELL_W,
                    y:    plat.y - 2,
                    vx:   (s === 0 ? -1 : 1) * (10 + Math.random() * 18),
                    vy:   -(3 + Math.random() * 7),
                    life: 1.0,
                    ch:   Math.random() < 0.6 ? '~' : '-',
                  })
                }
              }
              col.leadY = (!dark && rainCloudRow[ci] >= 0)
                ? rainCloudRow[ci]
                : -(1 + Math.random() * rows * 0.6)
              splashed  = true
              break
            }
          }
          if (splashed) continue

          // Check collision with a bot
          let hitBot = false
          for (const b of buddies) {
            if (cx >= b.x && cx <= b.x + BW &&
                leadPxY >= b.y && leadPxY <= b.y + BH) {
              if (Math.random() < 0.55) {
                rainSplash.push({
                  x:    cx,  y: leadPxY,
                  vx:   (Math.random() - 0.5) * 16,
                  vy:   -(2 + Math.random() * 5),
                  life: 0.8,
                  ch:   Math.random() < 0.5 ? "'" : '.',
                })
              }
              col.leadY = (!dark && rainCloudRow[ci] >= 0)
                ? rainCloudRow[ci]
                : -(1 + Math.random() * rows * 0.6)
              hitBot    = true
              break
            }
          }
          if (hitBot) continue

          // Reset when fully off screen
          if (col.leadY - col.trailLen > rows) {
            col.leadY    = (!dark && rainCloudRow[ci] >= 0)
              ? rainCloudRow[ci]
              : -(1 + Math.random() * 4)
            col.speed    = 18 + Math.random() * 16
            col.trailLen = 2 + Math.floor(Math.random() * 3)
          }

          // Render drop — thin `|` lead, short fading trail
          const leadRow = Math.floor(col.leadY)
          for (let i = 0; i <= col.trailLen; i++) {
            const row = leadRow - i
            if (row < 0 || row >= rows) continue
            const cy        = row * CELL_H
            const progress  = 1 - i / col.trailLen
            const baseAlpha = dark ? 0.04 + progress * 0.26 : 0.02 + progress * 0.10
            const ch        = i === 0 ? '|' : i === 1 ? "'" : '.'
            c2d.fillStyle   = dark
              ? `rgba(255,255,255,${baseAlpha})`
              : `rgba(30,30,30,${baseAlpha})`
            c2d.fillText(ch, cx, cy)
          }
        }
      }

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
          shootStars = []
          cityBursts = []
          rainSplash = []
          prevEffect = 'none'
          document.body.style.cursor = ''
        }
        if (prevMode === 'city') { shootStars = []; cityBursts = [] }
        prevMode = m
        if (m === 'rain') initRain()
        if (m === 'city') initCity(now)
        if (m === 'bots') initBots()
      }

      // ── Bots overlay effect transitions ──────────────────────────────────────
      if (m === 'bots') {
        const eff = effectRef.current
        if (eff !== prevEffect) {
          if (prevEffect === 'stars') { shootStars = []; cityBursts = [] }
          if (prevEffect === 'rain')  rainSplash = []
          prevEffect = eff
          if (eff === 'stars') initStars()
          if (eff === 'rain')  initBotsRain()
        }
        // ── Bots scene (nature ↔ city) transitions ────────────────────────────
        const sc = sceneRef.current
        if (sc !== prevScene) {
          prevScene = sc
          if (sc === 'city') {
            if (!cachedCityPlats) cachedCityPlats = generateCityPlatforms(cols, rows, CELL_W, CELL_H)
            platforms   = cachedCityPlats
            groundProps = []
            initCityBgAnim()   // spring animation: cells build in from random positions
          } else {
            if (!cachedNaturePlats) cachedNaturePlats = generateNaturePlatforms(cols, rows, CELL_W, CELL_H)
            platforms   = cachedNaturePlats
            groundProps = []
            initNatureBgAnim()
          }
        }
      }

      if      (m === 'density' || m === 'waves') drawField(t)
      else if (m === 'rain')                      drawRain(dt)
      else if (m === 'city')                      drawCity(now, dt)
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
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
      document.body.style.cursor = ''
    }
  }, [mounted])

  if (!mounted) return null

  // Bots mode: extend the visible band lower so buddies on the ground platform
  // (H*0.88) are fully opaque — fade doesn't start until 90%.
  const maskGrad = mode === 'bots'
    ? 'linear-gradient(to bottom, transparent 5%, black 15%, black 90%, transparent 100%)'
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
