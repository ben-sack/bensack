import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { keyframes } from '../stitches.config'

// ─── Grid geometry ─────────────────────────────────────────────────────────────
const CELL  = 110          // cell size (square)
const PAD   = 10           // paper inset per edge
const PAPER = CELL - PAD * 2  // 90px — actual paper/tile size
const COLS  = 18
const ROWS  = 14
const PLANE_W = COLS * CELL   // 1980
const PLANE_H = ROWS * CELL   // 1540

// ─── Destination tile positions ────────────────────────────────────────────────
const DEST = {
  resume: { col: 3,  row: 4, colSpan: 1 },
  craft:  { col: 9,  row: 4, colSpan: 1 },
  photos: { col: 14, row: 4, colSpan: 1 },
  market: { col: 3,  row: 9, colSpan: 2 },
  shell:  { col: 14, row: 9, colSpan: 1 },
} as const

// Cells occupied by destination tiles (excluded from background papers)
function destKey(col: number, row: number) { return `${col},${row}` }
const DEST_CELLS = new Set<string>()
Object.values(DEST).forEach(({ col, row, colSpan }) => {
  for (let c = col; c < col + colSpan; c++) DEST_CELLS.add(destKey(c, row))
})

// ─── Deterministic per-cell rest offsets ───────────────────────────────────────
function cellHash(col: number, row: number, salt: number): number {
  const n = (col * 2654435761 + row * 2246822519 + salt * 1013904223) >>> 0
  return (n & 0xffff) / 0xffff   // → [0, 1)
}
function restOffsets(col: number, row: number) {
  return {
    z:     (cellHash(col, row, 0) - 0.5) * 1.2,    // ±0.6 px
    rX:    (cellHash(col, row, 1) - 0.5) * 0.3,    // ±0.15°
    rY:    (cellHash(col, row, 2) - 0.5) * 0.3,    // ±0.15°
    phase: cellHash(col, row, 3) * Math.PI * 2,     // tremor phase
  }
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const craftFlow = keyframes({
  '0%, 100%': { backgroundPosition: '0% 50%'   },
  '50%':      { backgroundPosition: '100% 50%' },
})
const marketSweep = keyframes({
  '0%':   { transform: 'translateX(-120%) skewX(-20deg)', opacity: 0.6 },
  '100%': { transform: 'translateX(220%) skewX(-20deg)',  opacity: 0   },
})
const terminalBlink = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%':      { opacity: 0 },
})
const scanLines = keyframes({
  '0%':   { backgroundPosition: '0 0'   },
  '100%': { backgroundPosition: '0 4px' },
})

// ─── Tile backgrounds ──────────────────────────────────────────────────────────
function ResumeTile() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(170deg, #f0ede8 0%, #e2ded7 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.07) 18px)', backgroundSize: '100% 18px' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.65) 0%, transparent 70%)' }} />
    </div>
  )
}

function CraftTile() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #c084fc, #818cf8, #38bdf8, #34d399)', backgroundSize: '400% 400%', animation: `${craftFlow} 8s ease infinite`, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
    </div>
  )
}

function PhotosTile() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(150deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '140px 140px', opacity: 0.08, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 75% 20%, rgba(255,255,255,0.35) 0%, transparent 55%)' }} />
    </div>
  )
}

function MarketTile() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(120deg, #fef9eb 0%, #fde68a 50%, #fbbf24 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)', animation: `${marketSweep} 4s ease-in-out infinite`, animationDelay: '0.8s' }} />
    </div>
  )
}

function ShellTile() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0e1b0e', position: 'relative', overflow: 'hidden', fontFamily: 'Menlo, monospace' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 70%, rgba(0,255,80,0.18) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,80,0.03) 0px, rgba(0,255,80,0.03) 1px, transparent 1px, transparent 4px)', backgroundSize: '100% 4px', animation: `${scanLines} 0.5s linear infinite`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 12, left: 10, fontSize: 9, color: 'rgba(0,255,80,0.7)', letterSpacing: '0.04em', lineHeight: '16px', userSelect: 'none' }}>
        <div style={{ color: 'rgba(0,255,80,0.28)' }}>$ open links</div>
        <div>{'> '}<span style={{ display: 'inline-block', width: 6, height: 10, background: 'rgba(0,255,80,0.85)', animation: `${terminalBlink} 1s step-end infinite`, verticalAlign: 'text-bottom' }} /></div>
      </div>
    </div>
  )
}

// ─── Arrow icons ───────────────────────────────────────────────────────────────
function ArrowInternal() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M1.5 5.5H9.5M9.5 5.5L6 2M9.5 5.5L6 9" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ArrowExternal() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M2 9L9 2M9 2H5M9 2V6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Tile data ─────────────────────────────────────────────────────────────────
interface TileData {
  id:        string
  href:      string
  label:     string
  sub:       string
  external?: boolean
  bg:        React.ReactNode
  order:     number
}

const TILES: TileData[] = [
  { id: 'resume', href: '/resume',             label: 'resume',      sub: 'work & experience',          bg: <ResumeTile />, order: 0 },
  { id: 'craft',  href: '/craft',              label: 'craft',       sub: 'components & experiments',   bg: <CraftTile />,  order: 1 },
  { id: 'photos', href: '/photos',             label: 'photos',      sub: 'selected photography',       bg: <PhotosTile />, order: 2 },
  { id: 'market', href: 'https://bens.market', label: 'bens.market', sub: 'creative lab & marketplace', bg: <MarketTile />, order: 3, external: true },
  { id: 'shell',  href: 'https://sack.sh',     label: 'sack.sh',     sub: 'quick access',               bg: <ShellTile />,  order: 4, external: true },
]

// ─── Background paper cell data ────────────────────────────────────────────────
interface BgCell {
  col:    number
  row:    number
  left:   number
  top:    number
  idx:    number
  restZ:  number
  restRX: number
  restRY: number
  phase:  number
}

function buildBgCells(): BgCell[] {
  const cells: BgCell[] = []
  let idx = 0
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (DEST_CELLS.has(destKey(col, row))) continue
      const { z, rX, rY, phase } = restOffsets(col, row)
      cells.push({ col, row, left: col * CELL + PAD, top: row * CELL + PAD, idx, restZ: z, restRX: rX, restRY: rY, phase })
      idx++
    }
  }
  return cells
}

// ─── BackgroundPapers — memoized, only re-renders on theme change ──────────────
// All animation is imperative (rAF → style.transform). No FM, no state.
interface BgPapersProps {
  isDark:  boolean
  bgRefs:  React.MutableRefObject<(HTMLDivElement | null)[]>
  cells:   BgCell[]
}

const BackgroundPapers = React.memo(function BackgroundPapers({ isDark, bgRefs, cells }: BgPapersProps) {
  const bg     = isDark ? '#1d1d1b' : '#f5f3ef'
  const shadow = isDark
    ? '0 1px 4px rgba(0,0,0,0.55), inset 0 0 0 0.5px rgba(255,255,255,0.05)'
    : '0 1px 3px rgba(0,0,0,0.12), 0 0.5px 1px rgba(0,0,0,0.07), inset 0 0 0 0.5px rgba(0,0,0,0.06)'

  return (
    <>
      {cells.map((cell) => (
        <div
          key={`bg-${cell.col}-${cell.row}`}
          ref={(el) => { bgRefs.current[cell.idx] = el }}
          style={{
            position:  'absolute',
            left:       cell.left,
            top:        cell.top,
            width:      PAPER,
            height:     PAPER,
            borderRadius: 4,
            background: bg,
            boxShadow:  shadow,
            willChange: 'transform',
            transform: `translateZ(${cell.restZ.toFixed(1)}px) rotateX(${cell.restRX.toFixed(2)}deg) rotateY(${cell.restRY.toFixed(2)}deg)`,
          }}
        />
      ))}
    </>
  )
})

// ─── DestCard — Framer Motion hover lift + intra-tile parallax ────────────────
function DestCard({ data, hoveredId, setHoveredId }: {
  data:         TileData
  hoveredId:    string | null
  setHoveredId: (id: string | null) => void
}) {
  const pos        = DEST[data.id as keyof typeof DEST]
  const isHovered  = hoveredId === data.id
  const anyHovered = hoveredId !== null
  const cardWidth  = pos.colSpan * CELL - PAD * 2

  const tileRotX   = useMotionValue(0)
  const tileRotY   = useMotionValue(0)
  const springRotX = useSpring(tileRotX, { stiffness: 200, damping: 28 })
  const springRotY = useSpring(tileRotY, { stiffness: 200, damping: 28 })

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    tileRotX.set(((e.clientY - rect.top)  / rect.height - 0.5) * -10)
    tileRotY.set(((e.clientX - rect.left) / rect.width  - 0.5) *  10)
  }
  function handleMouseLeave() {
    tileRotX.set(0); tileRotY.set(0)
    setHoveredId(null)
  }

  return (
    // Layer 1 — entrance fade, absolute position in plane
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: data.order * 0.07 + 0.2, ease: 'easeOut' }}
      style={{
        position:       'absolute',
        left:            pos.col * CELL + PAD,
        top:             pos.row * CELL + PAD,
        width:           cardWidth,
        height:          PAPER,
        transformStyle: 'preserve-3d',
        zIndex:          2,
      }}
    >
      {/* Layer 2 — hover lift + viewer tilt */}
      <motion.div
        animate={{
          z:       isHovered ? 55 : anyHovered ? -4 : 0,
          rotateX: isHovered ? 4  : 0,
        }}
        transition={{
          type:      'spring',
          stiffness: isHovered ? 380 : 280,
          damping:   isHovered ? 26  : 30,
          mass:      isHovered ? 0.8 : 1,
        }}
        style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
      >
        {/* Surface shadow */}
        <motion.div
          aria-hidden
          animate={{ opacity: isHovered ? 0.45 : 0, scale: isHovered ? 1.14 : 0.85 }}
          transition={{ duration: 0.16, ease: [0.2, 0, 0.4, 1] }}
          style={{
            position:     'absolute',
            inset:        -4,
            borderRadius: 10,
            background:   'rgba(0,0,0,0.5)',
            filter:       'blur(18px)',
            z:            -55,
            pointerEvents: 'none',
          }}
        />

        {/* Layer 3 — card face: intra-tile parallax */}
        <motion.a
          href={data.href}
          target={data.external ? '_blank'             : undefined}
          rel={data.external    ? 'noopener noreferrer' : undefined}
          onMouseEnter={() => setHoveredId(data.id)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          animate={{
            scale:  isHovered ? 1.04 : anyHovered ? 0.97 : 1,
            filter: isHovered ? 'brightness(1.08)' : 'brightness(0.88)',
          }}
          transition={{
            scale:  { type: 'spring', stiffness: 280, damping: 28, mass: 0.9 },
            filter: { duration: 0.2 },
          }}
          style={{
            display:        'block',
            position:       'absolute',
            inset:           0,
            borderRadius:    8,
            overflow:       'hidden',
            textDecoration: 'none',
            cursor:         'pointer',
            boxShadow:      isHovered
              ? '0 6px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14)'
              : '0 1px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)',
            rotateX:         springRotX,
            rotateY:         springRotY,
            willChange:     'transform',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>{data.bg}</div>

          {/* Hover vignette */}
          <motion.div
            aria-hidden
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1)', pointerEvents: 'none' }}
          />

          {/* Arrow icon */}
          <motion.div
            aria-hidden
            animate={isHovered ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 3 }}
            transition={{ duration: 0.13, ease: [0.2, 0, 0.3, 1] }}
            style={{
              position:       'absolute',
              top:             7,
              right:           8,
              zIndex:          3,
              pointerEvents:  'none',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:           20,
              height:          20,
              borderRadius:    5,
              background:     'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(4px)',
              border:         '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {data.external ? <ArrowExternal /> : <ArrowInternal />}
          </motion.div>

          {/* Label */}
          <div style={{
            position:   'absolute',
            bottom:      0,
            left:        0,
            right:       0,
            padding:    '12px 10px 10px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)',
            zIndex:      2,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.93)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', letterSpacing: '-0.1px' }}>
              {data.label}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', marginTop: 2 }}>
              {data.sub}
            </div>
          </div>
        </motion.a>
      </motion.div>
    </motion.div>
  )
}

// ─── Mobile ────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [v, set] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    set(mq.matches)
    const fn = (e: MediaQueryListEvent) => set(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return v
}

function MobileGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', padding: '0 16px', boxSizing: 'border-box' }}>
      {TILES.map((tile, i) => (
        <motion.a
          key={tile.id}
          href={tile.href}
          target={tile.external ? '_blank' : undefined}
          rel={tile.external ? 'noopener noreferrer' : undefined}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.055 }}
          whileHover={{ scale: 1.02 }}
          style={{
            display:        'block',
            position:       'relative',
            height:          130,
            borderRadius:    8,
            overflow:       'hidden',
            textDecoration: 'none',
            gridColumn:     DEST[tile.id as keyof typeof DEST].colSpan === 2 ? 'span 2' : 'span 1',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>{tile.bg}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.92)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase' }}>{tile.label}</div>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

// ─── PerspectiveGrid ───────────────────────────────────────────────────────────
export default function PerspectiveGrid({ isDark }: { isDark: boolean }) {
  const isMobile   = useIsMobile()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Global mouse → grid tilt (no re-renders — all motion values)
  const mouseX   = useMotionValue(0.5)
  const mouseY   = useMotionValue(0.5)
  const smoothX  = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY  = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const gridRotX = useTransform(smoothY, [0, 1], [52, 58])
  const gridRotZ = useTransform(smoothX, [0, 1], [-9, -5])

  // Background paper cells — built once, stable reference
  const bgCells = useMemo<BgCell[]>(buildBgCells, [])
  const bgRefs  = useRef<(HTMLDivElement | null)[]>([])

  // ── Wind rAF + parallax in a single mousemove listener ───────────────────
  useEffect(() => {
    // Shared mouse state for both parallax and wind
    let mouseCX = COLS / 2
    let mouseCY = ROWS / 2
    let prevCX  = window.innerWidth  / 2
    let prevCY  = window.innerHeight / 2
    let velX    = 0
    let velY    = 0

    function onMouseMove(e: MouseEvent) {
      mouseX.set(e.clientX / window.innerWidth)
      mouseY.set(e.clientY / window.innerHeight)

      mouseCX = (e.clientX / window.innerWidth)  * COLS
      mouseCY = (e.clientY / window.innerHeight) * ROWS * 1.4

      const dX = (e.clientX - prevCX) / window.innerWidth  * COLS
      const dY = (e.clientY - prevCY) / window.innerHeight * ROWS
      velX = velX * 0.7 + dX * 0.3
      velY = velY * 0.7 + dY * 0.3
      prevCX = e.clientX
      prevCY = e.clientY
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // Wind constants — kept conservative so perspective-space rotations stay subtle
    const SIGMA    = 3.0
    const TWO_SIG2 = 2 * SIGMA * SIGMA
    const LIFT_AMP = 18      // px — gentle lift
    const TILT_AMP = 2.5     // degrees — small: perspective magnifies rotation
    const TREMOR_Z = 0.35    // px — barely perceptible idle tremor
    const TREMOR_R = 0.08    // degrees
    const LERP     = 0.10    // smoothing factor — higher = snappier, lower = more lag

    // Per-paper current (lerped) values — initialized to rest offsets
    const curZ  = new Float32Array(bgCells.map(c => c.restZ))
    const curRX = new Float32Array(bgCells.map(c => c.restRX))
    const curRY = new Float32Array(bgCells.map(c => c.restRY))

    let rafId: number

    function tick(now: number) {
      const t = now / 1000

      // Decay velocity toward zero when mouse is still
      velX *= 0.90
      velY *= 0.90

      const velMag   = Math.sqrt(velX * velX + velY * velY)
      const velNX    = velMag > 0.001 ? velX / velMag : 0
      const velNY    = velMag > 0.001 ? velY / velMag : 0
      // velMag ~0.03–0.10 cells/frame at typical speed
      const strength = Math.min(velMag * 12, 1.0)

      for (let i = 0; i < bgCells.length; i++) {
        const el = bgRefs.current[i]
        if (!el) continue

        const { col, row, restZ, restRX, restRY, phase } = bgCells[i]

        const dx    = col - mouseCX
        const dy    = row - mouseCY
        const dist2 = dx * dx + dy * dy
        const fo    = Math.exp(-dist2 / TWO_SIG2)

        const liftZ  = LIFT_AMP * fo * strength
        const tiltRX = TILT_AMP * fo * strength * velNY
        const tiltRY = -TILT_AMP * fo * strength * velNX

        const tremorZ  = TREMOR_Z * Math.sin(t * 1.1 + phase)
        const tremorRX = TREMOR_R * Math.sin(t * 0.8 + phase + 1.2)
        const tremorRY = TREMOR_R * Math.sin(t * 0.9 + phase + 2.4)

        // Lerp current values toward targets for smooth transitions
        const tZ  = restZ  + tremorZ  + liftZ
        const tRX = restRX + tremorRX + tiltRX
        const tRY = restRY + tremorRY + tiltRY

        curZ[i]  += (tZ  - curZ[i])  * LERP
        curRX[i] += (tRX - curRX[i]) * LERP
        curRY[i] += (tRY - curRY[i]) * LERP

        el.style.transform = `translateZ(${curZ[i]}px) rotateX(${curRX[i]}deg) rotateY(${curRY[i]}deg)`
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [bgCells, mouseX, mouseY])

  if (isMobile) return <MobileGrid />

  const surfaceBg = isDark ? '#111110' : '#e8e6e2'

  return (
    <div style={{
      width:             '100vw',
      height:            '100vh',
      overflow:          'hidden',
      perspective:        900,
      perspectiveOrigin: '50% 30%',
    }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        style={{
          position:       'absolute',
          left:           '50%',
          top:            '50%',
          x:              '-50%',
          y:              '-50%',
          width:           PLANE_W,
          height:          PLANE_H,
          rotateX:         gridRotX,
          rotateZ:         gridRotZ,
          transformStyle: 'preserve-3d',
          background:      surfaceBg,
        }}
      >
        {/* Background paper tiles — imperative animation via bgRefs */}
        <BackgroundPapers isDark={isDark} bgRefs={bgRefs} cells={bgCells} />

        {/* Destination tiles — Framer Motion driven */}
        {TILES.map((tile) => (
          <DestCard
            key={tile.id}
            data={tile}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
        ))}
      </motion.div>
    </div>
  )
}
