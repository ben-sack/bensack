// ─── Zones: the data behind the interactive ASCII mini-world ─────────────────────
// SignalField draws the *scenery* (backdrop + props + wandering buddies) for each
// BotScene. This file layers a thin, data-driven world on top: each zone gets one
// or two stationary NPCs that the visitor can click/tap to open a small dialogue
// panel linking out to real sections of the site.
//
// Adding a new NPC is just another entry in `npcs`. Adding a whole new zone is a
// new BotScene value (see components/SignalField.tsx) plus a key here.

import type { BotScene } from '../components/SignalField'
import { BUDDY_BODIES } from './buddies'

export interface NpcLink {
  label: string
  href: string
  /** Open in a new tab instead of client-side navigation. */
  external?: boolean
  /** Marks the hidden arcade link — plays a launch animation before routing. */
  game?: boolean
}

export interface Npc {
  id: string
  /** lowercase display name shown in the dialogue panel. */
  name: string
  /** key into BUDDY_BODIES — reuses the shared ASCII sprite set. */
  species: keyof typeof BUDDY_BODIES | string
  /** anchor position as viewport fractions (0–1). */
  x: number
  y: number
  /** mobile override position (falls back to x/y when omitted). */
  mobileX?: number
  mobileY?: number
  /** one or more lines of lowercase dialogue. */
  lines: string[]
  /** where this NPC can send you. */
  links: NpcLink[]
  /** short idle bubble shown above the sprite to signal it's interactive. */
  hint?: string
}

export interface Zone {
  id: BotScene
  /** lowercase label used by the world picker. */
  label: string
  /** one-line flavor text describing the zone. */
  blurb: string
  npcs: Npc[]
}

export const ZONES: Record<BotScene, Zone> = {
  nature: {
    id: 'nature',
    label: 'nature',
    blurb: 'the quiet default — mountains, pines, a low meadow.',
    npcs: [
      {
        id: 'nature-sage',
        name: 'sage',
        species: 'turtle',
        x: 0.2, y: 0.74,
        mobileX: 0.22, mobileY: 0.72,
        lines: ['...take your time out here.', 'everything ben makes is one trail away.'],
        hint: 'psst — say hi?',
        links: [
          { label: 'work', href: '/work' },
          { label: 'craft', href: '/craft' },
        ],
      },
      {
        id: 'nature-arcade',
        name: 'pip',
        species: 'rabbit',
        x: 0.8, y: 0.72,
        mobileX: 0.78, mobileY: 0.7,
        lines: ['psst… wanna see something ben tucked away back here?', 'it’s a tiny arcade. one button, endless trouble.'],
        hint: 'wanna play?',
        links: [{ label: 'play the secret game', href: '/play', game: true }],
      },
    ],
  },

  city: {
    id: 'city',
    label: 'city',
    blurb: 'neon skyline, rooftops, and a portal humming on the street.',
    npcs: [
      {
        id: 'city-courier',
        name: 'courier',
        species: 'robot',
        x: 0.18, y: 0.76,
        mobileX: 0.2, mobileY: 0.72,
        lines: ['beep. i ferry packets across the grid.', 'want to see what ben actually ships?'],
        hint: 'beep — click me',
        links: [{ label: 'work', href: '/work' }],
      },
      {
        id: 'city-neon',
        name: 'neon',
        species: 'cat',
        x: 0.82, y: 0.7,
        mobileX: 0.8, mobileY: 0.66,
        lines: ['mrrow. i nap on the warm servers.', 'the pretty little experiments live in craft.'],
        hint: 'mrrow?',
        links: [{ label: 'craft', href: '/craft' }],
      },
      {
        id: 'city-arcade',
        name: 'glitch',
        species: 'ghost',
        x: 0.5, y: 0.28,
        mobileX: 0.5, mobileY: 0.26,
        lines: ['booo— kidding. i haunt the old arcade cabinet.', 'nobody dusted it off in a while. wanna give it a go?'],
        hint: 'wanna play?',
        links: [{ label: 'play the secret game', href: '/play', game: true }],
      },
    ],
  },
}

// Order shown in the world picker.
export const ZONE_ORDER: BotScene[] = ['nature', 'city']
