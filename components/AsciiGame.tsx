import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useSoundEnabled } from '../lib/useSound'
import { setChromeHidden } from '../lib/uiChrome'
import { shuffleLetters } from '../lib/utils'
import { BUDDY_BODIES, BUDDY_NAMES, buddyBounds } from '../lib/buddies'

// Playable roster — the duck and snail art faces left (against the run direction), so skip them.
const GAME_NAMES = BUDDY_NAMES.filter((n) => n !== 'duck' && n !== 'snail')

// ─── Species abilities ─────────────────────────────────────────────────────────
// Each buddy plays differently. All effects are passive/auto so the controls
// (tap = jump, drag = duck) never change. `desc` is shown in the menu.
interface Ability {
  desc: string
  shield?: number          // shields you start with (each blocks one lethal hit)
  shieldMax?: number       // cap (defaults to `shield`)
  shieldRecharge?: number  // seconds to regain a shield, if set
  shieldPerOrbs?: number   // gain a shield every N orbs collected, if set
  clearOnBreak?: boolean   // on shield break, clear nearby hazards (revive feel)
  jumpMul?: number         // jump velocity multiplier
  gravityMul?: number      // gravity multiplier (<1 = floatier)
  maxJumps?: number        // override double-jump cap
  duckSpeedMul?: number    // world-speed boost while ducking
  orbMul?: number          // score multiplier per orb
  comboPerOrb?: number     // combo gained per orb (default 1)
  comboWindowMul?: number  // how much longer combos last
  magnetMul?: number       // pickup-radius multiplier
  dodge?: boolean          // ghost: auto-dodge a lethal hit, then recharge
  dodgeCooldown?: number   // seconds to recharge the dodge
  dodgeDur?: number        // intangible (shimmer) duration after a dodge
}

const ABILITIES: Record<string, Ability> = {
  goose:    { desc: 'honk · combos linger longer',  comboWindowMul: 1.9 },
  cat:      { desc: 'nine lives · revive once',      shield: 1, clearOnBreak: true },
  octopus:  { desc: 'float · extra hang time',       gravityMul: 0.78 },
  owl:      { desc: 'keen eye · ✦ worth ×1.5',       orbMul: 1.5 },
  penguin:  { desc: 'slide · faster while ducking',  duckSpeedMul: 1.45 },
  turtle:   { desc: 'shell · shield refills (9s)',   shield: 1, shieldRecharge: 9 },
  ghost:    { desc: 'phase · auto-dodge a hit (5s)',  dodge: true, dodgeCooldown: 5, dodgeDur: 1.0 },
  axolotl:  { desc: 'regrow · ✦ build shields',      shield: 0, shieldMax: 2, shieldPerOrbs: 12 },
  capybara: { desc: 'chill · big ✦ magnet',          magnetMul: 1.95 },
  cactus:   { desc: 'prickly · ✦ build combos fast', comboPerOrb: 2 },
  robot:    { desc: 'armor · shield refills (13s)',  shield: 1, shieldRecharge: 13 },
  rabbit:   { desc: 'hop · higher jump',             jumpMul: 1.15 },
  mushroom: { desc: 'springy · triple jump',         maxJumps: 3 },
}
const abilityOf = (i: number): Ability => ABILITIES[GAME_NAMES[i]] ?? { desc: '' }

// ─── Tunables ────────────────────────────────────────────────────────────────
// Lower gravity + generous airtime means a *single* jump clears every hazard at
// any speed. The double-jump is an optional bonus (high ✦ arcs / mid-air fixes).
const BASE_SPEED   = 280      // px/s world scroll at start
const SPEED_GROWTH = 7        // px/s gained per second alive
const SPEED_MAX    = 580      // px/s ceiling
const GRAVITY      = 1500     // px/s²
const JUMP_V       = 640      // initial jump velocity (up)
const JUMP2_V      = 560      // double-jump velocity
const MAX_JUMPS    = 2
const COMBO_WINDOW = 2.4      // s before a combo lapses
const BEST_KEY     = '__buddyrun_best__'

// ─── Hazard art ──────────────────────────────────────────────────────────────
// Ground hazards are inanimate (no eyes) so they read as obstacles, not buddies.
// prettier-ignore
const GROUND_HAZARDS: string[][] = [
  ['  /\\  ', ' /  \\ ', '/____\\'],            // pylon
  [' .--. ', '(    )', " '--' "],              // boulder
  ['  /\\  ', ' /||\\ ', '  ||  '],             // sapling
  ['/\\  /\\', '||  ||', '||  ||'],             // twin spikes
  ['  __  ', ' |  | ', ' |  | ', ' |__| '],    // tall pillar (taller jump)
]
// prettier-ignore
const FLY_HAZARDS: string[][] = [
  ['\\(\u00b7\u00b7)/'],   // bird wings up
  [' (\u00b7\u00b7) '],    // bird wings level
  ['/(\u00b7\u00b7)\\'],   // bird wings down
]
// Flight (wings power-up) tuning.
const FLY_TIME      = 7      // seconds aloft
const FLY_GRAVITY   = 1500   // px/s² pulling down while flying
const FLY_THRUST    = 2700   // px/s² upward accel while the rise input is held
const FLY_SPEED_MUL = 1.3    // world goes faster during flight

// Points on a unit sphere (Fibonacci lattice) for the rotating 3D ASCII emblem
// on the menu — projected + depth-shaded with pure math (no three.js).
const SPHERE_PTS: { x: number; y: number; z: number }[] = (() => {
  const n = 150
  const gold = Math.PI * (3 - Math.sqrt(5))
  const pts: { x: number; y: number; z: number }[] = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = gold * i
    pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r })
  }
  return pts
})()

// ─── Entity types ──────────────────────────────────────────────────────────────
interface Player   { feetY: number; vy: number; jumps: number; onGround: boolean; ducking: boolean; animFrame: number; animTimer: number; hopTimer: number }
interface Obstacle { kind: 'ground' | 'fly' | 'air'; art: string[]; x: number; wPx: number; lines: number; passed: boolean; flap: number; flapT: number; topY?: number }
interface Orb      { x: number; y: number; taken: boolean; ph: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; ch: string }
interface Cloud    { x: number; y: number; spd: number; art: string }

type PowerKind = 'magnet' | 'x2' | 'shield' | 'wings'
interface PowerUp { kind: PowerKind; x: number; y: number; ph: number }
const POWER_GLYPH: Record<PowerKind, string> = { magnet: '[M]', x2: '[2]', shield: '[+]', wings: '[^]' }
const MAGNET_TIME = 8
const X2_TIME = 10

// Late-game atmosphere that ramps with speed.
interface Meteor { x: number; y: number; vx: number; vy: number; life: number; max: number }
interface RainDrop { x: number; y: number; v: number; len: number }

type Phase = 'launcher' | 'menu' | 'playing' | 'paused' | 'dead'

// Arcade registry — add an entry to list a new game in the launcher.
const GAMES: { id: string; label: string; available: boolean }[] = [
  { id: 'buddyrun', label: 'buddy run', available: true },
  { id: 'soon-1', label: 'coming soon', available: false },
  { id: 'soon-2', label: 'coming soon', available: false },
]

const ASSEMBLE_TIME = 1.3   // seconds for the launcher sphere to assemble

// ASCII block-letter wordmark — "BUDDY" stacked over "RUN".
const TITLE_ART = [
  '\u2588\u2588\u2588 \u2588 \u2588 \u2588\u2588  \u2588\u2588  \u2588 \u2588 ',
  '\u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 ',
  '\u2588\u2588\u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588\u2588\u2588 ',
  '\u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588 \u2588   \u2588 ',
  '\u2588\u2588\u2588 \u2588\u2588\u2588 \u2588\u2588  \u2588\u2588    \u2588 ',
  '                    ',
  '    \u2588\u2588\u2588 \u2588 \u2588 \u2588 \u2588     ',
  '    \u2588 \u2588 \u2588 \u2588 \u2588\u2588\u2588     ',
  '    \u2588\u2588\u2588 \u2588 \u2588 \u2588 \u2588     ',
  '    \u2588 \u2588 \u2588 \u2588 \u2588 \u2588     ',
  '    \u2588 \u2588 \u2588\u2588\u2588 \u2588 \u2588     ',
]

interface World {
  w: number; h: number; dpr: number
  artFont: number; cellW: number; lineH: number; hudFont: number
  groundY: number; playerX: number
  speed: number; elapsed: number; score: number
  combo: number; comboT: number
  player: Player
  obstacles: Obstacle[]
  orbs: Orb[]
  particles: Particle[]
  clouds: Cloud[]
  spawnT: number; orbT: number
  groundScroll: number; midScroll: number; farScroll: number; speedline: number
  shake: number
  deadT: number
  launchT: number
  // Power-ups
  powerups: PowerUp[]
  puT: number
  magnetT: number
  x2T: number
  // Late-game atmosphere
  meteors: Meteor[]
  meteorT: number
  rain: RainDrop[]
  // Flight (wings power-up)
  flyT: number
  // Transient HUD pickup notice
  noticeMsg: string
  noticeT: number
  // Ability runtime
  ability: Ability
  shields: number
  shieldMax: number
  shieldCD: number
  orbsToShield: number
  iFrame: number
  phaseT: number
  phaseLeft: number
}

// Deterministic hash → [0,1), used for non-tiling starfields and ground tufts.
function hash(a: number, b: number): number {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export default function AsciiGame() {
  const { resolvedTheme } = useTheme()
  const [soundEnabled] = useSoundEnabled()

  const [phase, setPhaseState] = useState<Phase>('launcher')
  const [gameIndex, setGameIndex] = useState(0)
  const [speciesIndex, setSpeciesIndex] = useState(0)
  const [best, setBest] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isTouch, setIsTouch] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const titleRef  = useRef<HTMLPreElement>(null)
  const menuBodyRef = useRef<HTMLDivElement>(null)

  // Mutable mirrors so the rAF loop reads fresh values without re-subscribing.
  const phaseRef    = useRef<Phase>('launcher')
  const gameIndexRef = useRef(0)
  const pendingLaunchRef = useRef(-1)   // game index queued for the break-apart transition
  const speciesRef  = useRef(0)
  const darkRef     = useRef(true)
  const soundRef    = useRef(true)
  const reducedRef  = useRef(false)
  const worldRef    = useRef<World | null>(null)
  const audioRef    = useRef<AudioContext | null>(null)

  useEffect(() => { darkRef.current = resolvedTheme !== 'light' }, [resolvedTheme])
  useEffect(() => { soundRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { speciesRef.current = speciesIndex }, [speciesIndex])

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p) }, [])
  useEffect(() => { gameIndexRef.current = gameIndex }, [gameIndex])

  // Enter the arcade launcher (replays the sphere entrance animation).
  const goLauncher = useCallback(() => {
    const w = worldRef.current
    if (w) w.launchT = 0
    setPhase('launcher')
  }, [setPhase])

  // Queue a game launch — the loop plays the sphere break-apart, then opens the
  // menu. No-op for unavailable slots.
  const launchGame = useCallback((idx: number) => {
    if (!GAMES[idx]?.available) return
    setGameIndex(idx)
    gameIndexRef.current = idx
    pendingLaunchRef.current = idx
  }, [])

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches || 'ontouchstart' in window)
  }, [])

  // Hide the global Dock during an active run (avoids accidental nav taps and
  // adds immersion); animate it back the moment we leave the playing state.
  useEffect(() => { setChromeHidden(phase === 'playing') }, [phase])
  useEffect(() => () => setChromeHidden(false), [])

  // ── Synth audio (no asset files — chiptune blips via Web Audio) ──────────────
  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    const ctx = audioRef.current
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }, [])

  const beep = useCallback((freq: number, dur: number, type: OscillatorType = 'square', gain = 0.05, slideTo?: number) => {
    if (!soundRef.current) return
    const ctx = audioRef.current
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }, [])

  // ── Main effect: sizing, input, and the animation loop ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const c2d = canvas.getContext('2d')
    if (!c2d) return

    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      const b = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
      if (!Number.isNaN(b)) setBest(b)
    } catch { /* ignore */ }

    const makeWorld = (): World => ({
      w: 0, h: 0, dpr: 1,
      artFont: 16, cellW: 10, lineH: 24, hudFont: 13,
      groundY: 0, playerX: 0,
      speed: BASE_SPEED, elapsed: 0, score: 0,
      combo: 0, comboT: 0,
      player: { feetY: 0, vy: 0, jumps: 0, onGround: true, ducking: false, animFrame: 0, animTimer: 0, hopTimer: 2 },
      obstacles: [], orbs: [], particles: [], clouds: [],
      spawnT: 1, orbT: 1.6,
      groundScroll: 0, midScroll: 0, farScroll: 0, speedline: 0,
      shake: 0, deadT: 0, launchT: 0,
      powerups: [], puT: 9, magnetT: 0, x2T: 0,
      meteors: [], meteorT: 3, rain: [],
      flyT: 0, noticeMsg: '', noticeT: 0,
      ability: { desc: '' }, shields: 0, shieldMax: 0, shieldCD: 0, orbsToShield: 0,
      iFrame: 0, phaseT: 0, phaseLeft: 0,
    })

    const W = worldRef.current ?? makeWorld()
    worldRef.current = W

    // Whether a "rise" input (space/up/tap) is currently held — drives flight ascent.
    let held = false

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W.w = rect.width
      W.h = rect.height
      W.dpr = dpr
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Smaller, more proportionate art on narrow/mobile screens (lower floor).
      const f = Math.max(10, Math.min(20, Math.round(Math.min(W.w, W.h) / 40)))
      W.artFont = f
      W.lineH = Math.round(f * 1.5)
      W.hudFont = Math.max(11, Math.round(f * 0.85))
      c2d.font = `${f}px Menlo, "Courier New", monospace`
      W.cellW = c2d.measureText('M').width || f * 0.6
      // Leave room at the bottom for the floating dock.
      W.groundY = W.h - Math.max(132, W.h * 0.2)
      W.playerX = Math.max(48, W.w * 0.16)
      if (phaseRef.current !== 'playing') W.player.feetY = W.groundY
      if (W.clouds.length === 0) seedClouds()
    }

    const seedClouds = () => {
      const arts = ['(   )', '(    )', '(  )']
      const n = reducedRef.current ? 2 : 3
      W.clouds = Array.from({ length: n }, (_, i) => ({
        x: (W.w / n) * i + hash(i, 3) * 120,
        y: 40 + hash(i, 7) * (W.groundY * 0.35),
        spd: 12 + hash(i, 11) * 16,
        art: arts[i % arts.length],
      }))
    }

    const ink = (a: number) => darkRef.current ? `rgba(232,232,232,${a})` : `rgba(24,24,24,${a})`

    // ── Run lifecycle ──────────────────────────────────────────────────────────
    const resetRun = () => {
      W.speed = BASE_SPEED
      W.elapsed = 0
      W.score = 0
      W.combo = 0
      W.comboT = 0
      W.obstacles = []
      W.orbs = []
      W.particles = []
      W.spawnT = 0.9
      W.orbT = 1.4
      W.powerups = []
      W.puT = 8 + Math.random() * 5
      W.magnetT = 0
      W.x2T = 0
      W.meteors = []
      W.meteorT = 3
      W.rain = []
      W.flyT = 0
      W.noticeMsg = ''
      W.noticeT = 0
      W.shake = 0
      W.deadT = 0
      W.player.feetY = W.groundY
      W.player.vy = 0
      W.player.jumps = 0
      W.player.onGround = true
      W.player.ducking = false
      const ab = abilityOf(speciesRef.current)
      W.ability = ab
      W.shields = ab.shield ?? 0
      W.shieldMax = ab.shieldMax ?? ab.shield ?? 0
      W.shieldCD = 0
      W.orbsToShield = 0
      W.iFrame = 0
      W.phaseT = 0      // dodge ready immediately (ghost)
      W.phaseLeft = 0
    }

    const startRun = () => { resetRun(); setPhase('playing'); beep(523, 0.08, 'square', 0.05, 784) }

    const jump = () => {
      const p = W.player
      const maxJumps = W.ability.maxJumps ?? MAX_JUMPS
      if (p.jumps >= maxJumps) return
      const mul = W.ability.jumpMul ?? 1
      p.vy = (p.jumps === 0 ? -JUMP_V : -JUMP2_V) * mul
      p.jumps += 1
      p.onGround = false
      beep(p.jumps === 1 ? 440 : 620, 0.12, 'square', 0.045, p.jumps === 1 ? 680 : 920)
    }

    // A lethal touch — dodged (ghost), then absorbed by a shield, else fatal.
    const hit = () => {
      if (phaseRef.current !== 'playing') return
      const ab = W.ability
      if (ab.dodge && W.phaseT <= 0) {
        W.phaseLeft = ab.dodgeDur ?? 1.0
        W.phaseT = ab.dodgeCooldown ?? 5
        beep(880, 0.18, 'sine', 0.045, 1320)
        return
      }
      if (W.shields > 0) {
        W.shields -= 1
        W.shieldCD = 0
        W.iFrame = 1.1
        W.shake = reducedRef.current ? 0 : 9
        beep(620, 0.16, 'square', 0.05, 220)
        const p = W.player
        const bx = W.playerX + W.cellW * 4
        const by = p.feetY - 2 * W.lineH
        const n = reducedRef.current ? 5 : 12
        for (let k = 0; k < n; k++) {
          const ang = (Math.PI * 2 * k) / n
          W.particles.push({ x: bx, y: by, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0, max: 0.4 + Math.random() * 0.25, ch: k % 2 ? '\u00b0' : '\u2726' })
        }
        // Revive-style buddies sweep away the immediate threat on break.
        if (W.ability.clearOnBreak) {
          W.obstacles = W.obstacles.filter((o) => o.x > W.playerX + W.cellW * 12)
        }
        return
      }
      die()
    }

    const die = () => {
      if (phaseRef.current !== 'playing') return
      const p = W.player
      const frame = BUDDY_BODIES[GAME_NAMES[speciesRef.current]][p.animFrame % 3]
      const topY = p.feetY - 5 * W.lineH
      const max = reducedRef.current ? 26 : 80
      let made = 0
      for (let li = 0; li < frame.length && made < max; li++) {
        for (let ci = 0; ci < frame[li].length && made < max; ci++) {
          const ch = frame[li][ci]
          if (ch === ' ') continue
          const gx = W.playerX + ci * W.cellW
          const gy = topY + li * W.lineH
          W.particles.push({
            x: gx, y: gy,
            vx: (Math.random() - 0.5) * 220 - 40,
            vy: (Math.random() - 0.9) * 320,
            life: 0, max: 0.9 + Math.random() * 0.7,
            ch: ch === '\u00b7' ? '\u2726' : ch,
          })
          made++
        }
      }
      W.shake = reducedRef.current ? 0 : 16
      beep(330, 0.5, 'sawtooth', 0.06, 70)
      beep(160, 0.6, 'square', 0.04, 50)
      const fs = Math.floor(W.score)
      setFinalScore(fs)
      setBest((prev) => {
        const nb = Math.max(prev, fs)
        try { localStorage.setItem(BEST_KEY, String(nb)) } catch { /* ignore */ }
        return nb
      })
      W.deadT = 0
      setPhase('dead')
    }

    // ── Spawning ─────────────────────────────────────────────────────────────
    const artWidth = (art: string[]) => art.reduce((m, l) => Math.max(m, l.length), 0)

    const spawnObstacle = () => {
      const pFly = Math.min(0.4, 0.16 + W.elapsed * 0.004)
      if (Math.random() < pFly) {
        const art = FLY_HAZARDS[0]
        W.obstacles.push({ kind: 'fly', art, x: W.w + 24, wPx: artWidth(art) * W.cellW, lines: 1, passed: false, flap: 0, flapT: 0.12 })
      } else {
        const idx = Math.random() < 0.16 ? 4 : Math.floor(Math.random() * 4)
        const art = GROUND_HAZARDS[idx]
        W.obstacles.push({ kind: 'ground', art, x: W.w + 24, wPx: artWidth(art) * W.cellW, lines: art.length, passed: false, flap: 0, flapT: 0 })
      }
      let interval = Math.max(0.7, 1.25 - W.elapsed * 0.012) + Math.random() * 0.45
      if (W.speed * interval < 250) interval = 250 / W.speed
      W.spawnT = interval
    }

    const spawnOrbs = () => {
      const arc = Math.random() < 0.6
      if (arc) {
        // Peaks just above standing reach so a normal jump sweeps the whole arc.
        const n = 5
        const amp = 3.2 * W.lineH
        const base = W.groundY - W.lineH * 0.9
        const sp = W.cellW * 3.4
        for (let k = 0; k < n; k++) {
          const lift = Math.sin((Math.PI * k) / (n - 1)) * amp
          W.orbs.push({ x: W.w + 30 + k * sp, y: base - lift, taken: false, ph: hash(k, 9) })
        }
      } else {
        // Chest-height row — collectible while running.
        const n = 4
        const sp = W.cellW * 2.8
        const y = W.groundY - W.lineH * (1.6 + Math.random() * 0.6)
        for (let k = 0; k < n; k++) {
          W.orbs.push({ x: W.w + 30 + k * sp, y, taken: false, ph: hash(k, 13) })
        }
      }
      W.orbT = 1.3 + Math.random() * 1.5
    }

    const spawnPowerup = () => {
      const intensity = Math.min(1, Math.max(0, (W.speed - BASE_SPEED) / (SPEED_MAX - BASE_SPEED)))
      let kind: PowerKind
      // Wings get more likely the faster (deeper) you are; rare early on.
      if (intensity > 0.25 && Math.random() < 0.25 + intensity * 0.45) {
        kind = 'wings'
      } else {
        const kinds: PowerKind[] = ['magnet', 'x2', 'shield']
        kind = kinds[Math.floor(Math.random() * kinds.length)]
      }
      W.powerups.push({ kind, x: W.w + 36, y: W.groundY - W.lineH * 2.6, ph: 0 })
      W.puT = 13 + Math.random() * 8
    }

    const spawnFlyOrb = () => {
      // A flowing ribbon of ✦, high in the air, to chase while aloft.
      const mid = W.groundY - W.lineH * 5.2
      const amp = W.lineH * 2.2
      const y = mid + Math.sin(W.elapsed * 2.6) * amp
      W.orbs.push({ x: W.w + 24, y, taken: false, ph: Math.random() })
    }

    const spawnMeteor = () => {
      const sx = W.w * (0.45 + Math.random() * 0.6)
      const sy = -W.lineH + Math.random() * W.groundY * 0.35
      const speed = 620 + Math.random() * 380
      W.meteors.push({ x: sx, y: sy, vx: -speed * (0.7 + Math.random() * 0.2), vy: speed * (0.35 + Math.random() * 0.2), life: 0, max: 1.4 })
    }

    const notice = (msg: string) => { W.noticeMsg = msg; W.noticeT = 1.9 }

    const activatePower = (kind: PowerKind) => {
      if (kind === 'magnet') { W.magnetT = MAGNET_TIME; notice('magnet \u2726'); beep(700, 0.12, 'triangle', 0.05, 1100) }
      else if (kind === 'x2') { W.x2T = X2_TIME; notice('\u00d72 score'); beep(620, 0.14, 'square', 0.05, 1240) }
      else if (kind === 'wings') {
        W.flyT = FLY_TIME
        W.player.vy = -220        // gentle initial lift
        W.player.onGround = false
        notice('wings \u2014 hold to fly!')
        beep(523, 0.1, 'triangle', 0.05, 1046); beep(784, 0.18, 'sine', 0.04, 1318)
      }
      else { W.shields += 1; W.shieldMax = Math.max(W.shieldMax, W.shields); notice('shield up!'); beep(540, 0.16, 'sine', 0.05, 980) }
      const bx = W.playerX + W.cellW * 5
      const by = W.player.feetY - 2.4 * W.lineH
      const n = reducedRef.current ? 4 : 10
      for (let k = 0; k < n; k++) {
        const ang = (Math.PI * 2 * k) / n
        W.particles.push({ x: bx, y: by, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160 - 30, life: 0, max: 0.45 + Math.random() * 0.3, ch: k % 2 ? '\u2726' : '\u00b0' })
      }
    }

    const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
      ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

    // Geometry for the launcher emblem sphere (shared by update + draw).
    const launcherCenter = () => ({ cx: W.w / 2, cy: W.h * 0.27, radius: Math.min(W.w, W.h) * 0.12 })

    // Explode the emblem's points into flying particles (the launcher→menu transition).
    const launcherBurst = () => {
      const { cx, cy, radius } = launcherCenter()
      const ay = W.launchT * 0.7
      const cosA = Math.cos(ay), sinA = Math.sin(ay)
      const cosB = Math.cos(0.5), sinB = Math.sin(0.5)
      const max = reducedRef.current ? 40 : SPHERE_PTS.length
      for (let i = 0; i < max; i++) {
        const pt = SPHERE_PTS[i]
        const x1 = pt.x * cosA + pt.z * sinA
        const z1 = -pt.x * sinA + pt.z * cosA
        const y2 = pt.y * cosB - z1 * sinB
        const z2 = pt.y * sinB + z1 * cosB
        const sx = cx + x1 * radius, sy = cy - y2 * radius
        W.particles.push({
          x: sx, y: sy,
          vx: (sx - cx) * 2.4 + (Math.random() - 0.5) * 70,
          vy: (sy - cy) * 2.4 - 70 + (Math.random() - 0.5) * 70,
          life: 0, max: 0.7 + Math.random() * 0.5,
          ch: (z2 + 1) / 2 > 0.6 ? '\u2726' : '\u00b7',
        })
      }
      beep(523, 0.08, 'triangle', 0.05, 1046); beep(880, 0.2, 'sine', 0.04, 1318)
    }

    // ── Update ───────────────────────────────────────────────────────────────
    const update = (dt: number) => {
      const ph = phaseRef.current
      if (ph === 'paused') return
      if (ph === 'launcher') {
        if (pendingLaunchRef.current >= 0) {
          launcherBurst()
          pendingLaunchRef.current = -1
          setPhase('menu')
          return
        }
        W.launchT += dt
        for (const cl of W.clouds) { cl.x -= cl.spd * dt; if (cl.x < -80) { cl.x = W.w + 40; cl.y = 40 + Math.random() * (W.groundY * 0.35) } }
        for (let i = W.particles.length - 1; i >= 0; i--) {
          const pt = W.particles[i]
          pt.life += dt; pt.vy += GRAVITY * 0.3 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt
          if (pt.life >= pt.max) W.particles.splice(i, 1)
        }
        W.farScroll += 8 * dt
        return
      }
      const p = W.player
      const ab = W.ability
      const playing = ph === 'playing'
      const dead = ph === 'dead'
      const ducked = p.ducking && p.onGround

      if (playing) {
        W.elapsed += dt
        W.speed = Math.min(SPEED_MAX, BASE_SPEED + W.elapsed * SPEED_GROWTH)
      } else if (dead) {
        W.deadT += dt
        W.speed *= Math.max(0, 1 - dt * 5)
      }

      // Effective scroll speed: penguin speeds up while ducking; flight bumps it.
      // Player physics (jump/gravity) stay in real time. On small screens we scale
      // the world down with the art so it reads as a zoomed-out view — smaller px
      // speed → more lead time and more obstacles visible at once on mobile.
      const worldScale = Math.min(1, Math.max(0.6, W.lineH / 30))
      let sc = W.speed * worldScale
      if (ducked && ab.duckSpeedMul) sc *= ab.duckSpeedMul
      if (W.flyT > 0) sc *= FLY_SPEED_MUL
      W.groundScroll += sc * dt
      W.midScroll += sc * 0.35 * dt
      W.farScroll += sc * 0.1 * dt
      W.speedline += sc * dt

      // Player physics — jetpack while flying, normal gravity otherwise.
      if (W.flyT > 0) {
        p.vy += (FLY_GRAVITY - (held ? FLY_THRUST : 0)) * dt
        p.vy = Math.max(-440, Math.min(560, p.vy))
        p.feetY += p.vy * dt
        const ceilFeet = 5 * W.lineH + 16
        if (p.feetY < ceilFeet) { p.feetY = ceilFeet; if (p.vy < 0) p.vy = 0 }
        if (p.feetY > W.groundY) { p.feetY = W.groundY; if (p.vy > 0) p.vy = 0 }
        p.onGround = false
        if (held && !reducedRef.current && Math.random() < 0.7) {
          W.particles.push({ x: W.playerX + W.cellW * (3 + Math.random() * 4), y: p.feetY, vx: (Math.random() - 0.5) * 50, vy: 110 + Math.random() * 90, life: 0, max: 0.3, ch: '\u00b0' })
        }
      } else {
        p.vy += GRAVITY * (ab.gravityMul ?? 1) * dt
        p.feetY += p.vy * dt
        if (p.feetY >= W.groundY) { p.feetY = W.groundY; p.vy = 0; p.jumps = 0; p.onGround = true }
        else p.onGround = false
      }
      p.animTimer -= dt
      if (p.animTimer <= 0) { p.animFrame = (p.animFrame + 1) % 3; p.animTimer = Math.max(0.07, 0.16 - sc * 0.0001) }

      // Idle hops in the menu so the buddy feels alive
      if (ph === 'menu' && p.onGround) {
        p.hopTimer -= dt
        if (p.hopTimer <= 0) { p.vy = -560; p.onGround = false; p.hopTimer = 1.6 + Math.random() * 1.6 }
      }

      // Clouds
      for (const cl of W.clouds) {
        cl.x -= (cl.spd + sc * 0.04) * dt
        if (cl.x < -80) { cl.x = W.w + 40; cl.y = 40 + Math.random() * (W.groundY * 0.35) }
      }

      if (playing) {
        if (W.flyT > 0) {
          W.flyT -= dt
          W.orbT -= dt
          if (W.orbT <= 0) { spawnFlyOrb(); W.orbT = 0.3 }
        } else {
          W.spawnT -= dt
          if (W.spawnT <= 0) spawnObstacle()
          W.orbT -= dt
          if (W.orbT <= 0) spawnOrbs()
        }
        W.puT -= dt
        if (W.puT <= 0) spawnPowerup()
        if (W.magnetT > 0) W.magnetT -= dt
        if (W.x2T > 0) W.x2T -= dt
        if (W.noticeT > 0) W.noticeT -= dt
        W.score += sc * dt * 0.04 * (W.x2T > 0 ? 2 : 1)
        W.comboT -= dt
        if (W.comboT <= 0) W.combo = 0

        // Escalating late-game atmosphere — scales with current speed.
        const intensity = Math.min(1, Math.max(0, (W.speed - BASE_SPEED) / (SPEED_MAX - BASE_SPEED)))
        if (!reducedRef.current) {
          if (intensity > 0.2) {       // shooting stars, more frequent as it ramps
            W.meteorT -= dt
            if (W.meteorT <= 0) { spawnMeteor(); W.meteorT = (1.7 - intensity * 1.3) * (0.6 + Math.random() * 0.9) }
          }
          const want = intensity > 0.5 ? Math.floor((intensity - 0.5) * 2 * 60) : 0   // rain density
          while (W.rain.length < want) W.rain.push({ x: Math.random() * (W.w + 120), y: Math.random() * W.groundY, v: 680 + Math.random() * 360, len: W.lineH * (0.7 + Math.random() * 0.6) })
          if (W.rain.length > want) W.rain.length = want
        }

        // Ability timers: invulnerability frames, shield recharge, ghost phasing.
        if (W.iFrame > 0) W.iFrame -= dt
        if (ab.shieldRecharge && W.shields < W.shieldMax) {
          W.shieldCD += dt
          if (W.shieldCD >= ab.shieldRecharge) { W.shields += 1; W.shieldCD = 0 }
        }
        // Ghost dodge: phaseLeft = active intangibility, phaseT = recharge timer.
        if (W.phaseLeft > 0) W.phaseLeft -= dt
        if (W.phaseT > 0) W.phaseT -= dt
      }

      // Obstacles — hitbox centered on the buddy's body (cols ~3–9), kept forgiving.
      const pH = ducked ? 2.4 * W.lineH : 4.2 * W.lineH
      const pBoxX = W.playerX + W.cellW * 3.4
      const pBoxW = W.cellW * 3.4
      const pBoxY = p.feetY - pH
      for (let i = W.obstacles.length - 1; i >= 0; i--) {
        const ob = W.obstacles[i]
        ob.x -= sc * dt
        if (ob.kind === 'fly') { ob.flapT -= dt; if (ob.flapT <= 0) { ob.flap = (ob.flap + 1) % FLY_HAZARDS.length; ob.flapT = 0.12 } }
        if (ob.x + ob.wPx < -30) { W.obstacles.splice(i, 1); continue }
        // While flying only air hazards bite; on the ground only ground/birds do.
        const collidable = W.flyT > 0 ? ob.kind === 'air' : ob.kind !== 'air'
        if (playing && collidable) {
          let bx: number, by: number, bw: number, bh: number
          if (ob.kind === 'ground') {
            bx = ob.x + ob.wPx * 0.2; bw = ob.wPx * 0.6
            by = W.groundY - ob.lines * W.lineH * 0.78; bh = ob.lines * W.lineH * 0.78
          } else if (ob.kind === 'air') {
            bx = ob.x + ob.wPx * 0.16; bw = ob.wPx * 0.68
            by = (ob.topY ?? 0) + W.lineH * 0.1; bh = ob.lines * W.lineH * 0.8
          } else {
            bx = ob.x + ob.wPx * 0.1; bw = ob.wPx * 0.8
            by = W.groundY - 3.95 * W.lineH; bh = W.lineH
          }
          const invuln = W.iFrame > 0 || W.phaseLeft > 0
          if (!invuln && overlap(pBoxX, pBoxY, pBoxW, pH, bx, by, bw, bh)) { hit(); return }
        }
      }

      // Orbs — collect when the sparkle's center overlaps the buddy's *drawn*
      // glyph box (inflated by a small pad). The box is several cells wide, so a
      // simple per-frame containment test is robust against high-speed tunneling.
      const oframe = BUDDY_BODIES[GAME_NAMES[speciesRef.current]][p.animFrame % 3]
      const ob2 = buddyBounds(oframe)
      // Magnet power-up temporarily widens the catch radius and vacuums orbs in.
      const magnetActive = W.magnetT > 0
      const magnet = Math.max(ab.magnetMul ?? 1, magnetActive ? 4 : 1)
      const standReach = (5 - ob2.minRow) * W.lineH
      const reach = ducked ? Math.min(standReach, 2.6 * W.lineH) : standReach
      const padX = W.cellW * 0.7 * magnet
      const padY = W.lineH * 0.5 * magnet
      const colL = W.playerX + ob2.minCol * W.cellW - padX
      const colR = W.playerX + (ob2.maxCol + 1) * W.cellW + padX
      const colT = p.feetY - reach - padY
      const colB = p.feetY + padY
      const magX = W.playerX + W.cellW * 5
      const magY = p.feetY - 2 * W.lineH
      for (let i = W.orbs.length - 1; i >= 0; i--) {
        const o = W.orbs[i]
        o.x -= sc * dt
        o.ph += dt
        if (magnetActive && o.x < W.w * 0.7) {
          const f = Math.min(1, dt * 7)
          o.x += (magX - o.x) * f
          o.y += (magY - o.y) * f
        }
        if (o.x < -30) { W.orbs.splice(i, 1); continue }
        if (playing && !o.taken && o.x >= colL && o.x <= colR && o.y >= colT && o.y <= colB) {
          o.taken = true
          W.combo += ab.comboPerOrb ?? 1
          W.comboT = COMBO_WINDOW * (ab.comboWindowMul ?? 1)
          const mult = Math.min(6, 1 + Math.floor(W.combo / 4))
          W.score += 10 * mult * (ab.orbMul ?? 1) * (W.x2T > 0 ? 2 : 1)
          if (ab.shieldPerOrbs) {
            W.orbsToShield += 1
            if (W.orbsToShield >= ab.shieldPerOrbs) { W.orbsToShield = 0; if (W.shields < W.shieldMax) W.shields += 1 }
          }
          beep(840 + W.combo * 32, 0.09, 'square', 0.04, 1180 + W.combo * 40)
          const pc = reducedRef.current ? 3 : 7
          for (let k = 0; k < pc; k++) {
            const ang = (Math.PI * 2 * k) / pc + Math.random() * 0.5
            const spd = 70 + Math.random() * 90
            W.particles.push({ x: o.x, y: o.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 40, life: 0, max: 0.35 + Math.random() * 0.3, ch: k === 0 ? '\u2726' : '\u00b7' })
          }
          W.orbs.splice(i, 1)
        }
      }

      // Power-ups — same catch box as orbs.
      for (let i = W.powerups.length - 1; i >= 0; i--) {
        const pu = W.powerups[i]
        pu.x -= sc * dt
        pu.ph += dt
        if (pu.x < -40) { W.powerups.splice(i, 1); continue }
        if (playing && pu.x >= colL && pu.x <= colR && pu.y >= colT && pu.y <= colB) {
          activatePower(pu.kind)
          W.powerups.splice(i, 1)
        }
      }

      // Particles
      for (let i = W.particles.length - 1; i >= 0; i--) {
        const pt = W.particles[i]
        pt.life += dt
        pt.vy += GRAVITY * 0.45 * dt
        pt.x += pt.vx * dt
        pt.y += pt.vy * dt
        if (pt.life >= pt.max) W.particles.splice(i, 1)
      }

      // Meteors + rain (atmosphere)
      for (let i = W.meteors.length - 1; i >= 0; i--) {
        const m = W.meteors[i]
        m.x += m.vx * dt; m.y += m.vy * dt; m.life += dt
        if (m.life > m.max || m.y > W.groundY || m.x < -80) W.meteors.splice(i, 1)
      }
      for (const d of W.rain) {
        d.y += d.v * dt
        d.x -= d.v * 0.32 * dt
        if (d.y > W.groundY) { d.y = -d.len - Math.random() * W.groundY * 0.3; d.x = Math.random() * (W.w + 160) }
      }

      if (W.shake > 0) W.shake = Math.max(0, W.shake - dt * 60)
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    const pad = (n: number, len: number) => String(Math.max(0, Math.floor(n))).padStart(len, '0')

    // Launcher emblem: a 3D ASCII sparkle sphere that assembles from scattered
    // points, then spins. Orthographic projection + painter's sort + depth
    // shading — pure trig, no dependencies.
    const drawLauncher = () => {
      const { cx, cy, radius } = launcherCenter()
      const assemble = Math.min(1, W.launchT / ASSEMBLE_TIME)
      const e = 1 - Math.pow(1 - assemble, 3)             // easeOutCubic
      const ay = W.launchT * 0.7
      const cosA = Math.cos(ay), sinA = Math.sin(ay)
      const cosB = Math.cos(0.5), sinB = Math.sin(0.5)
      const out: { sx: number; sy: number; d: number }[] = []
      for (let i = 0; i < SPHERE_PTS.length; i++) {
        const pt = SPHERE_PTS[i]
        const x1 = pt.x * cosA + pt.z * sinA
        const z1 = -pt.x * sinA + pt.z * cosA
        const y2 = pt.y * cosB - z1 * sinB
        const z2 = pt.y * sinB + z1 * cosB
        const tx = cx + x1 * radius, ty = cy - y2 * radius
        const a0 = hash(i, 1) * Math.PI * 2
        const d0 = radius * (2 + hash(i, 2) * 1.6)
        const sx = (cx + Math.cos(a0) * d0) + (tx - (cx + Math.cos(a0) * d0)) * e
        const sy = (cy + Math.sin(a0) * d0) + (ty - (cy + Math.sin(a0) * d0)) * e
        out.push({ sx, sy, d: (z2 + 1) / 2 })
      }
      out.sort((a, b) => a.d - b.d)
      c2d.textAlign = 'center'
      c2d.textBaseline = 'middle'
      c2d.font = `${Math.max(9, Math.round(radius * 0.18))}px Menlo, "Courier New", monospace`
      for (const pp of out) {
        const glyph = pp.d > 0.8 ? '\u2726' : pp.d > 0.5 ? '*' : pp.d > 0.25 ? '+' : '\u00b7'
        c2d.fillStyle = ink((0.08 + pp.d * 0.5) * e)
        c2d.fillText(glyph, pp.sx, pp.sy)
      }
      c2d.textAlign = 'left'
      c2d.textBaseline = 'top'
    }

    const draw = () => {
      const reduced = reducedRef.current
      c2d.clearRect(0, 0, W.w, W.h)
      c2d.textBaseline = 'top'

      c2d.save()
      if (W.shake > 0.4) c2d.translate((Math.random() - 0.5) * W.shake, (Math.random() - 0.5) * W.shake)

      // Stars
      c2d.font = `${Math.round(W.artFont * 0.7)}px Menlo, "Courier New", monospace`
      const stepX = W.cellW
      const colOff = Math.floor(W.farScroll / stepX)
      const ridgeBase = W.groundY - W.lineH * 1.6
      const cols = Math.ceil(W.w / stepX) + 2
      const rowMax = Math.floor((W.groundY * 0.5) / (W.lineH * 0.8))
      for (let col = 0; col < cols; col++) {
        const wc = col + colOff
        for (let row = 0; row < rowMax; row++) {
          const hsh = hash(wc * 1.3, row * 2.1)
          if (hsh > 0.985) {
            let a = hsh > 0.993 ? 0.2 : 0.12
            if (!reduced) a *= 0.55 + 0.45 * Math.sin(W.elapsed * 1.8 + wc + row)
            c2d.fillStyle = ink(a)
            c2d.fillText(hsh > 0.993 ? '*' : '\u00b7', col * stepX - (W.farScroll % stepX), row * W.lineH * 0.8 + 12)
          }
        }
      }

      // Shooting stars (late-game) — bright head + fading trail.
      for (const m of W.meteors) {
        const fade = Math.min(1, m.life * 5, (m.max - m.life) * 3)
        for (let t = 0; t < 7; t++) {
          const tx = m.x - m.vx * (t * 0.014)
          const ty = m.y - m.vy * (t * 0.014)
          c2d.fillStyle = ink((t === 0 ? 0.5 : 0.32) * (1 - t / 7) * fade)
          c2d.fillText(t === 0 ? '*' : '\u00b7', tx, ty)
        }
      }

      // Rolling ridge (distant hills)
      c2d.fillStyle = ink(0.12)
      for (let x = 0; x <= W.w; x += stepX) {
        const wx = (x + W.midScroll) * 0.01
        const y = ridgeBase - W.groundY * 0.1 * (0.5 + 0.5 * Math.sin(wx) + 0.25 * Math.sin(wx * 2.3 + 1))
        c2d.fillText('\u00b7', x, y)
      }

      // Clouds
      c2d.fillStyle = ink(0.16)
      c2d.font = `${W.artFont}px Menlo, "Courier New", monospace`
      for (const cl of W.clouds) c2d.fillText(cl.art, cl.x, cl.y)

      // Speed lines
      if (!reduced && phaseRef.current === 'playing' && W.speed > BASE_SPEED + 80) {
        c2d.fillStyle = ink(0.07)
        for (let i = 0; i < 6; i++) {
          const ly = W.groundY - W.lineH * (2 + i * 1.3)
          const lx = (W.w - ((W.speedline * 1.5 + i * 220) % (W.w + 200)))
          c2d.fillText('\u2014\u2014', lx, ly)
        }
      }

      // Ground line + tufts
      c2d.fillStyle = ink(0.26)
      c2d.fillRect(0, W.groundY, W.w, 1)
      c2d.fillStyle = ink(0.16)
      const tuftStep = W.cellW * 2
      const tuftChars = ['\u0022', ',', '.', '`']
      for (let x = -tuftStep; x <= W.w; x += tuftStep) {
        const wi = Math.floor((x + W.groundScroll) / tuftStep)
        const hsh = hash(wi, 5)
        if (hsh > 0.62) c2d.fillText(tuftChars[Math.floor(hash(wi, 6) * 4) % 4], x - (W.groundScroll % tuftStep) + tuftStep, W.groundY - W.lineH * 0.85)
      }

      // Rotating 3D ASCII emblem behind the title (menu only)
      if (phaseRef.current === 'launcher') drawLauncher()

      // Orbs — drawn centered so (o.x, o.y) is the true visual center used for pickup.
      c2d.font = `${W.artFont}px Menlo, "Courier New", monospace`
      c2d.textAlign = 'center'
      c2d.textBaseline = 'middle'
      for (const o of W.orbs) {
        const a = 0.5 + 0.5 * Math.sin(o.ph * 6)
        if (!reduced) { c2d.shadowColor = ink(0.55); c2d.shadowBlur = 6 + 4 * a }
        c2d.fillStyle = ink(0.6 + 0.3 * a)
        c2d.fillText('\u2726', o.x, o.y)
      }
      c2d.shadowBlur = 0

      // Power-ups — bracketed tokens, centered like orbs.
      for (const pu of W.powerups) {
        const a = 0.6 + 0.4 * Math.sin(pu.ph * 5)
        if (!reduced) { c2d.shadowColor = ink(0.6); c2d.shadowBlur = 10 }
        c2d.fillStyle = ink(0.7 + 0.25 * a)
        c2d.fillText(POWER_GLYPH[pu.kind], pu.x, pu.y)
      }
      c2d.shadowBlur = 0
      c2d.textAlign = 'left'
      c2d.textBaseline = 'top'

      // Obstacles
      c2d.fillStyle = ink(0.6)
      for (const ob of W.obstacles) {
        if (ob.kind === 'ground') {
          const topY = W.groundY - ob.lines * W.lineH
          for (let li = 0; li < ob.art.length; li++) c2d.fillText(ob.art[li], ob.x, topY + li * W.lineH)
        } else if (ob.kind === 'air') {
          const topY = ob.topY ?? 0
          for (let li = 0; li < ob.art.length; li++) c2d.fillText(ob.art[li], ob.x, topY + li * W.lineH)
        } else {
          c2d.fillText(FLY_HAZARDS[ob.flap][0], ob.x, W.groundY - 3.3 * W.lineH)
        }
      }

      // Player (unless dissolving / booting). Ducking = a squash-and-stretch crouch
      // anchored at the feet, rather than chopping off the head.
      const p = W.player
      if (phaseRef.current !== 'dead' && phaseRef.current !== 'launcher') {
        const frame = BUDDY_BODIES[GAME_NAMES[speciesRef.current]][p.animFrame % 3]
        let alpha = 0.92
        if (W.phaseLeft > 0) alpha = 0.32 + 0.12 * Math.sin(W.elapsed * 30)        // ghost shimmer
        else if (W.iFrame > 0) alpha = Math.sin(W.elapsed * 42) > 0 ? 0.92 : 0.34  // post-hit blink
        c2d.fillStyle = ink(alpha)
        const drawArt = () => {
          for (let li = 0; li < frame.length; li++) {
            const line = frame[li].replace(/\u00b7/g, '\u25c9')
            c2d.fillText(line, W.playerX, p.feetY - (5 - li) * W.lineH)
          }
        }
        if (p.ducking && p.onGround) {
          const anchorX = W.playerX + W.cellW * 6
          c2d.save()
          c2d.translate(anchorX, p.feetY)
          c2d.scale(1.15, 0.58)
          c2d.translate(-anchorX, -p.feetY)
          drawArt()
          c2d.restore()
        } else {
          drawArt()
        }
      }

      // Particles
      for (const pt of W.particles) {
        const a = 1 - pt.life / pt.max
        c2d.fillStyle = ink(0.75 * a)
        c2d.fillText(pt.ch, pt.x, pt.y)
      }

      // Rain (late-game) — diagonal streaks across the foreground.
      if (W.rain.length) {
        c2d.strokeStyle = ink(0.18)
        c2d.lineWidth = 1
        c2d.beginPath()
        for (const d of W.rain) {
          c2d.moveTo(d.x, d.y)
          c2d.lineTo(d.x - d.len * 0.32, d.y + d.len)
        }
        c2d.stroke()
      }

      c2d.restore()

      // HUD (stable, above shake)
      const ph = phaseRef.current
      if (ph === 'playing' || ph === 'dead' || ph === 'paused') {
        c2d.font = `${W.hudFont}px Menlo, "Courier New", monospace`
        c2d.fillStyle = ink(0.7)
        c2d.textAlign = 'left'
        c2d.fillText(`score ${pad(W.score, 5)}`, 18, 18)
        c2d.textAlign = 'right'
        c2d.fillText(`best ${pad(Math.max(best, Math.floor(W.score)), 5)}`, W.w - 18, 18)
        if (ph === 'playing' && (W.magnetT > 0 || W.x2T > 0 || W.flyT > 0)) {
          const fx: string[] = []
          if (W.flyT > 0) fx.push(`fly ${Math.ceil(W.flyT)}`)
          if (W.x2T > 0) fx.push(`\u00d72 ${Math.ceil(W.x2T)}`)
          if (W.magnetT > 0) fx.push(`magnet ${Math.ceil(W.magnetT)}`)
          c2d.textAlign = 'center'
          c2d.fillStyle = ink(0.62)
          c2d.fillText(fx.join('   \u00b7   '), W.w / 2, 18)
        }
        c2d.textAlign = 'left'
        let hudRow = 0
        const rowY = () => 18 + W.hudFont + 8 + hudRow * (W.hudFont + 6)
        if (W.shieldMax > 0) {
          const dots = '\u25c9'.repeat(W.shields) + '\u25cc'.repeat(Math.max(0, W.shieldMax - W.shields))
          c2d.fillStyle = ink(0.6)
          c2d.fillText(`shield ${dots}`, 18, rowY())
          hudRow++
        }
        if (W.ability.dodge) {
          const ready = W.phaseT <= 0
          c2d.fillStyle = ink(ready ? 0.7 : 0.38)
          c2d.fillText(`dodge ${ready ? '\u25c9' : '\u25cc'}`, 18, rowY())
          hudRow++
        }
        if (W.combo > 0 && ph === 'playing') {
          const mult = Math.min(6, 1 + Math.floor(W.combo / 4))
          c2d.fillStyle = ink(0.5 + 0.4 * (W.comboT / (COMBO_WINDOW * (W.ability.comboWindowMul ?? 1))))
          c2d.fillText(`x${mult}  +${W.combo}`, W.playerX, Math.max(40, p.feetY - 5.6 * W.lineH))
        }
        // Transient power-up pickup notice
        if (W.noticeT > 0 && ph === 'playing') {
          const fade = Math.min(1, W.noticeT / 0.5)
          const rise = (1 - Math.min(1, W.noticeT / 1.9)) * 10
          c2d.font = `${Math.round(W.artFont * 1.15)}px Menlo, "Courier New", monospace`
          c2d.textAlign = 'center'
          c2d.fillStyle = ink(0.85 * fade)
          c2d.fillText(W.noticeMsg, W.w / 2, W.h * 0.26 - rise)
          c2d.textAlign = 'left'
        }
      }
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      let dt = (now - last) / 1000
      last = now
      if (dt > 1 / 20) dt = 1 / 20
      if (!document.hidden) { update(dt); draw() }
    }

    // ── Input ────────────────────────────────────────────────────────────────
    // `held` = a rise input is currently down. During flight it drives ascent;
    // otherwise the press triggers a discrete jump / start.
    const flying = () => W.flyT > 0

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code
      if (phaseRef.current === 'launcher') {
        ensureAudio()
        if (code === 'ArrowUp' || code === 'KeyW') { e.preventDefault(); setGameIndex((i) => (i - 1 + GAMES.length) % GAMES.length); beep(330, 0.05) }
        else if (code === 'ArrowDown' || code === 'KeyS') { e.preventDefault(); setGameIndex((i) => (i + 1) % GAMES.length); beep(392, 0.05) }
        else if (code === 'Space' || code === 'Enter') {
          e.preventDefault()
          if (GAMES[gameIndexRef.current]?.available) launchGame(gameIndexRef.current)
          else beep(200, 0.1, 'square', 0.04)
        }
        return
      }
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        e.preventDefault(); ensureAudio()
        held = true
        if (flying()) return
        const ph = phaseRef.current
        if (ph === 'menu') startRun()
        else if (ph === 'playing') jump()
        else if (ph === 'paused') setPhase('playing')
        else if (ph === 'dead' && W.deadT > 0.5) startRun()
      } else if (code === 'Enter') {
        e.preventDefault(); ensureAudio()
        const ph = phaseRef.current
        if (ph === 'menu') startRun()
        else if (ph === 'paused') setPhase('playing')
        else if (ph === 'dead' && W.deadT > 0.5) startRun()
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        e.preventDefault(); if (phaseRef.current === 'playing' && !flying()) W.player.ducking = true
      } else if (code === 'ArrowLeft' || code === 'KeyA') {
        if (phaseRef.current === 'menu') { ensureAudio(); setSpeciesIndex((i) => (i - 1 + GAME_NAMES.length) % GAME_NAMES.length); beep(330, 0.05) }
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        if (phaseRef.current === 'menu') { ensureAudio(); setSpeciesIndex((i) => (i + 1) % GAME_NAMES.length); beep(392, 0.05) }
      } else if (code === 'KeyP') {
        if (phaseRef.current === 'playing') setPhase('paused')
        else if (phaseRef.current === 'paused') setPhase('playing')
      } else if (code === 'Escape') {
        const ph = phaseRef.current
        if (ph === 'menu') goLauncher()
        else if (ph === 'paused' || ph === 'dead') setPhase('menu')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') held = false
      if (e.code === 'ArrowDown' || e.code === 'KeyS') W.player.ducking = false
    }
    // Touch gesture (ground): a quick tap = jump, a drag-down = hold-to-duck. We
    // defer the tap→jump decision to pointer-up. While flying, a press just rises.
    const DRAG_TH = 24
    let gesture: 'none' | 'pending' | 'duck' | 'jump' = 'none'
    let activeId: number | null = null
    let startY = 0

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault(); ensureAudio()
      held = true
      const ph = phaseRef.current
      if (ph === 'launcher') return   // launcher selection handled by the DOM list
      if (ph !== 'playing') {
        if (ph === 'menu') startRun()
        else if (ph === 'paused') setPhase('playing')
        else if (ph === 'dead' && W.deadT > 0.4) startRun()
        return
      }
      if (flying()) return
      if (e.pointerType === 'touch') {
        activeId = e.pointerId
        startY = e.clientY
        gesture = 'pending'
      } else {
        jump()
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (flying() || activeId === null || e.pointerId !== activeId || gesture !== 'pending') return
      const dy = e.clientY - startY
      if (dy > DRAG_TH) { gesture = 'duck'; W.player.ducking = true }
      else if (dy < -DRAG_TH) { gesture = 'jump'; jump() }
    }
    const onPointerUp = (e: PointerEvent) => {
      held = false
      W.player.ducking = false
      if (activeId !== null && e.pointerId === activeId) {
        if (!flying() && gesture === 'pending') jump()
        gesture = 'none'
        activeId = null
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      audioRef.current?.close().catch(() => {})
      audioRef.current = null
    }
  }, [beep, ensureAudio, setPhase])

  // Staged menu entrance: a short delay (so the break-apart particles read),
  // then the ASCII wordmark decodes in, then the body text scrambles in with the
  // site-wide shuffleLetters reveal.
  useEffect(() => {
    if (phase !== 'menu') return
    const title = titleRef.current
    const body = menuBodyRef.current
    if (title) title.style.opacity = '0'
    if (body) body.style.opacity = '0'

    const timers: ReturnType<typeof setTimeout>[] = []
    const cleanups: Array<() => void> = []
    const DELAY = 480

    timers.push(setTimeout(() => {
      if (!title) return
      title.style.opacity = '1'
      const scramble = '\u2591\u2592\u2593\u2588'
      const final = TITLE_ART.join('\n')
      let frame = 0
      const total = 26
      const id = setInterval(() => {
        frame++
        const p = frame / total
        title.textContent = TITLE_ART.map((row) =>
          row.split('').map((ch) => (ch === ' ' ? ' ' : Math.random() < p ? ch : scramble[Math.floor(Math.random() * scramble.length)])).join(''),
        ).join('\n')
        if (frame >= total) { clearInterval(id); title.textContent = final }
      }, 1000 / 30)
      cleanups.push(() => clearInterval(id))
    }, DELAY))

    timers.push(setTimeout(() => {
      if (body) body.style.opacity = '1'
      const lines = body ? Array.from(body.querySelectorAll<HTMLElement>('[data-shuffle]')) : []
      lines.forEach((el, i) => {
        timers.push(setTimeout(() => { cleanups.push(shuffleLetters(el, { iterations: 6 })) }, i * 110))
      })
    }, DELAY + 700))

    return () => { timers.forEach(clearTimeout); cleanups.forEach((c) => c()) }
  }, [phase])

  const speciesName = GAME_NAMES[speciesIndex]

  const overlayBase: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 3,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', pointerEvents: 'none',
    fontFamily: 'var(--fonts-body)', color: 'var(--colors-gray12)',
    padding: 24,
  }
  const dim: React.CSSProperties = { color: 'var(--colors-gray9)', fontSize: 12, letterSpacing: '0.02em', textTransform: 'lowercase' }
  const prompt: React.CSSProperties = { color: 'var(--colors-gray11)', fontSize: 13, letterSpacing: '0.04em', textTransform: 'lowercase', marginTop: 18 }
  const arrowBtn: React.CSSProperties = {
    pointerEvents: 'auto', cursor: 'pointer', background: 'transparent', border: 0,
    color: 'var(--colors-gray9)', fontSize: 20, fontFamily: 'var(--fonts-mono)', padding: '4px 10px',
    transition: 'color 150ms ease', lineHeight: 1,
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100dvh',
        overflow: 'hidden', background: 'var(--colors-gray1)', zIndex: 1,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none' }} aria-label="ASCII arcade game" />

      {/* CRT scanlines + vignette */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 42%, transparent 52%, rgba(0,0,0,0.22) 100%)',
          mixBlendMode: 'multiply', opacity: 0.6,
        }}
      />

      {/* Launcher / arcade home */}
      {phase === 'launcher' && (
        <div style={{ ...overlayBase, justifyContent: 'flex-start', paddingTop: 'min(46vh, 420px)' }}>
          <p style={{ fontSize: 13, letterSpacing: '0.34em', textTransform: 'lowercase', color: 'var(--colors-gray11)', margin: 0 }}>arcade</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 18, pointerEvents: 'auto' }}>
            {GAMES.map((g, i) => (
              <button
                key={g.id}
                disabled={!g.available}
                onMouseEnter={() => { if (g.available) setGameIndex(i) }}
                onClick={() => launchGame(i)}
                style={{
                  background: 'transparent', border: 0, cursor: g.available ? 'pointer' : 'default',
                  fontFamily: 'var(--fonts-body)', fontSize: 17, letterSpacing: '0.04em', textTransform: 'lowercase',
                  padding: '5px 8px', transition: 'color 150ms ease', whiteSpace: 'pre',
                  color: !g.available ? 'var(--colors-gray7)' : i === gameIndex ? 'var(--colors-gray12)' : 'var(--colors-gray9)',
                }}
              >
                {(i === gameIndex && g.available ? '\u25b8 ' : '  ') + g.label}
              </button>
            ))}
          </div>
          <p style={prompt}>{isTouch ? 'tap a game to play' : '\u2191 \u2193 select \u00b7 space to play'}</p>
        </div>
      )}

      {/* Menu */}
      {phase === 'menu' && (
        <div style={{ ...overlayBase, justifyContent: 'flex-start', paddingTop: 'min(20vh, 180px)' }}>
          <pre
            ref={titleRef}
            aria-hidden
            style={{
              margin: 0,
              fontFamily: 'var(--fonts-mono)',
              fontSize: 'clamp(7px, 2.6vw, 14px)',
              lineHeight: 1,
              letterSpacing: 0,
              color: 'var(--colors-gray12)',
              whiteSpace: 'pre',
              userSelect: 'none',
              opacity: 0,
              transition: 'opacity 300ms ease',
            }}
          >
{TITLE_ART.join('\n')}
          </pre>

          <div ref={menuBodyRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', opacity: 0, transition: 'opacity 320ms ease' }}>
          <p data-shuffle style={{ ...dim, marginTop: 10 }}>an ascii arcade · jump the hazards, duck the birds, chase the ✦</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 26 }}>
            <button
              style={arrowBtn}
              aria-label="previous buddy"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--colors-gray9)')}
              onClick={() => setSpeciesIndex((i) => (i - 1 + GAME_NAMES.length) % GAME_NAMES.length)}
            >
              ‹
            </button>
            <span style={{ minWidth: 130, fontSize: 15, letterSpacing: '0.06em', textTransform: 'lowercase', color: 'var(--colors-gray12)', fontVariantNumeric: 'tabular-nums' }}>
              {speciesName}
            </span>
            <button
              style={arrowBtn}
              aria-label="next buddy"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--colors-gray9)')}
              onClick={() => setSpeciesIndex((i) => (i + 1) % GAME_NAMES.length)}
            >
              ›
            </button>
          </div>

          <p data-shuffle style={{ color: 'var(--colors-gray11)', fontSize: 12.5, letterSpacing: '0.03em', textTransform: 'lowercase', marginTop: 10, minHeight: 16 }}>
            {abilityOf(speciesIndex).desc}
          </p>

          <p data-shuffle style={prompt}>{isTouch ? 'tap to play' : 'press space or tap to play'}</p>
          <p data-shuffle style={{ ...dim, marginTop: 22 }}>
            {isTouch ? 'tap to jump · drag down to duck' : 'space / ↑ jump (×2) · ↓ duck · p pause'} · best {best}
          </p>
          <button
            onClick={goLauncher}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--colors-gray9)')}
            style={{ pointerEvents: 'auto', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--colors-gray9)', fontFamily: 'var(--fonts-body)', fontSize: 12, letterSpacing: '0.04em', textTransform: 'lowercase', marginTop: 16, padding: '4px 8px', transition: 'color 150ms ease' }}
          >
            ‹ arcade
          </button>
          </div>
        </div>
      )}

      {/* Paused */}
      {phase === 'paused' && (
        <div style={overlayBase}>
          <h2 style={{ fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: 500, textTransform: 'lowercase', margin: 0, letterSpacing: '-0.01em' }}>paused</h2>
          <p style={prompt}>press p to resume</p>
        </div>
      )}

      {/* Game over */}
      {phase === 'dead' && (
        <div style={overlayBase}>
          <h2 style={{ fontSize: 'clamp(30px, 7vw, 48px)', fontWeight: 500, textTransform: 'lowercase', margin: 0, letterSpacing: '-0.01em' }}>game over</h2>
          <p style={{ color: 'var(--colors-gray11)', fontSize: 15, letterSpacing: '0.04em', textTransform: 'lowercase', marginTop: 12 }}>
            score {finalScore}{finalScore >= best && finalScore > 0 ? ' · new best!' : ` · best ${best}`}
          </p>
          <p style={prompt}>{isTouch ? 'tap to retry' : 'press space or tap to retry'}</p>
          <p style={{ ...dim, marginTop: 18 }}>{isTouch ? 'use the menu to go back' : 'esc → menu'}</p>
        </div>
      )}
    </div>
  )
}
