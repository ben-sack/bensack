import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// ─── Character ramp — ordered light → dense ────────────────────────────────
const RAMP = [' ', '.', ':', ';', '=', '+', 'x', '#', '@'] as const

// Field value → ramp index
// Idle sine field sits in [-1, ~1], mouse bump adds up to +1.5 at center
function toRampIdx(v: number): number {
  if (v < -0.55) return 0
  if (v < -0.10) return 1
  if (v <  0.15) return 2
  if (v <  0.40) return 3
  if (v <  0.65) return 4  // ← idle field peaks around here
  if (v <  0.90) return 5  // mouse influence starts
  if (v <  1.15) return 6
  if (v <  1.40) return 7
  return 8
}

// Three overlapping sine waves → organic, slowly shifting field
function sampleField(nx: number, ny: number, t: number): number {
  return (
    Math.sin(nx * 4.5 + t * 0.32 + ny * 2.1) * 0.42 +
    Math.sin(nx * 8.8 - ny * 2.6 + t * 0.20) * 0.28 +
    Math.sin(nx * 2.0 + ny * 4.8 + t * 0.17) * 0.30
  )
}

const CELL_W = 11
const CELL_H = 18
const FONT   = '12px Menlo, "Courier New", monospace'

// Alpha per ramp level (0 = space, invisible)
const DARK_ALPHA  = [0, 0.07, 0.09, 0.12, 0.15, 0.22, 0.34, 0.46, 0.58]
const LIGHT_ALPHA = [0, 0.05, 0.07, 0.09, 0.11, 0.16, 0.25, 0.36, 0.48]

export default function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const isDarkRef = useRef(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => { isDarkRef.current = resolvedTheme === 'dark' }, [resolvedTheme])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Captured as non-null for use inside nested callbacks
    const el  = canvas as HTMLCanvasElement
    const c2d = ctx    as CanvasRenderingContext2D

    let W = 0, H = 0, cols = 0, rows = 0
    let animId = 0

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
    }
    resize()

    const onMouseMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }

    window.addEventListener('resize',     resize,       { passive: true })
    window.addEventListener('mousemove',  onMouseMove,  { passive: true })
    window.addEventListener('mouseleave', onMouseLeave, { passive: true })

    // Pre-allocate buckets — reused every frame to avoid GC pressure
    const buckets: Array<Array<{ x: number; y: number }>> =
      Array.from({ length: RAMP.length }, () => [])

    const start = performance.now()

    function draw(now: number) {
      const t    = (now - start) / 1000
      const mx   = mouseRef.current.x
      const my   = mouseRef.current.y
      const dark = isDarkRef.current
      const alphas = dark ? DARK_ALPHA : LIGHT_ALPHA

      c2d.clearRect(0, 0, W, H)
      c2d.font = FONT
      c2d.textBaseline = 'top'

      // Reset buckets
      for (const b of buckets) b.length = 0

      // Sample field and assign each cell to a ramp bucket
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * CELL_W
          const cy = row * CELL_H

          let v = sampleField(cx / W, cy / H, t)

          // Gaussian mouse lens — blooms density around the cursor
          const dx = (cx - mx) / 180
          const dy = (cy - my) / 180
          v += Math.exp(-(dx * dx + dy * dy) * 0.5) * 1.5

          const idx = toRampIdx(v)
          if (idx > 0) buckets[idx].push({ x: cx, y: cy })
        }
      }

      // Draw each density level in one pass (minimises fillStyle changes)
      for (let i = 1; i < RAMP.length; i++) {
        if (buckets[i].length === 0) continue
        c2d.fillStyle = dark
          ? `rgba(255,255,255,${alphas[i]})`
          : `rgba(30,30,30,${alphas[i]})`
        const ch = RAMP[i]
        for (const { x, y } of buckets[i]) {
          c2d.fillText(ch, x, y)
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize',     resize)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [mounted])

  if (!mounted) return null

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
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, black 28%, black 72%, transparent 92%)',
        maskImage:       'linear-gradient(to bottom, transparent 10%, black 28%, black 72%, transparent 92%)',
      }}
    />
  )
}
