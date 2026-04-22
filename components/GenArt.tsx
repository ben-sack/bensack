import { useEffect, useRef, useState, useCallback } from 'react'
import type { GenArtType } from '../lib/data'

export type { GenArtType }

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Seeded Perlin noise ──────────────────────────────────────────────────────
function mkNoise(seed: number) {
  const rng  = mkRng(seed)
  const N    = 256
  const perm = Array.from({ length: N }, (_, i) => i)
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  const p    = [...perm, ...perm]
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const dot2 = (h: number, x: number, y: number) =>
    ((h & 1) ? -x : x) + ((h & 2) ? -y : y)

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & (N - 1)
    const yi = Math.floor(y) & (N - 1)
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u  = fade(xf), v = fade(yf)
    const aa = p[p[xi]     + yi],   ab = p[p[xi]     + yi + 1]
    const ba = p[p[xi + 1] + yi],   bb = p[p[xi + 1] + yi + 1]
    return lerp(
      lerp(dot2(aa, xf,     yf),     dot2(ba, xf - 1, yf),     u),
      lerp(dot2(ab, xf,     yf - 1), dot2(bb, xf - 1, yf - 1), u),
      v
    ) * 0.5 + 0.5
  }
}

// ── Flow field ───────────────────────────────────────────────────────────────
type FlowParticle = { x: number; y: number; age: number; life: number }

function runFlowField(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height

  const noise = mkNoise(seed)
  const rng   = mkRng(seed ^ 0xDEAD4321)

  // Seed-derived character — each seed produces a distinct composition
  const cells   = 2.5 + rng() * 4.5                           // noise zoom: 2.5–7 cells across shortest axis
  const scale   = cells / Math.min(W, H)
  const count   = Math.floor(350 + rng() * 350)               // 350–700 particles
  const speed   = (1.0 + rng() * 1.5) * (Math.min(W, H) / 400)
  const maxAge  = Math.floor(100 + rng() * 120)
  const useOct2 = rng() > 0.45                                // 55%: second octave adds turbulence
  const bias    = (rng() - 0.5) * 0.8                        // global curl

  const bg = dark ? '#0e0e0e' : '#f3f3f3'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const particles: FlowParticle[] = Array.from({ length: count }, () => ({
    x:    rng() * W,
    y:    rng() * H,
    age:  Math.floor(rng() * maxAge),
    life: maxAge - 20 + Math.floor(rng() * 40),
  }))

  let rafId: number
  const onVis = () => {}  // handled via isPaused()
  document.addEventListener('visibilitychange', onVis)

  const getAngle = (x: number, y: number) => {
    let n = noise(x * scale, y * scale)
    if (useOct2) n = n * 0.65 + noise(x * scale * 2.1, y * scale * 2.1) * 0.35
    return (n + bias) * Math.PI * 4
  }

  const tick = () => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return

    ctx.globalAlpha = 0.045
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
    ctx.lineWidth = 0.8

    for (const p of particles) {
      const a  = getAngle(p.x, p.y)
      const nx = p.x + Math.cos(a) * speed
      const ny = p.y + Math.sin(a) * speed

      const fadeIn  = Math.min(1, p.age / (p.life * 0.15))
      const fadeOut = (1 - p.age / p.life) < 0.4 ? (1 - p.age / p.life) / 0.4 : 1
      const alpha   = fadeIn * fadeOut * (dark ? 0.45 : 0.32)

      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(nx, ny)
      ctx.strokeStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(12,12,12,${alpha})`
      ctx.stroke()

      p.x = nx; p.y = ny; p.age++

      if (p.age >= p.life || nx < -10 || nx > W + 10 || ny < -10 || ny > H + 10) {
        p.x   = rng() * W
        p.y   = rng() * H
        p.age = 0
        p.life = maxAge - 20 + Math.floor(rng() * 40)
      }
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(rafId)
    document.removeEventListener('visibilitychange', onVis)
  }
}

// ── Reaction diffusion (Gray-Scott) ─────────────────────────────────────────
function runReactionDiffusion(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height
  const rng = mkRng(seed)

  // Simulation grid — larger MAX_DIM reduces upscale ratio and keeps edges crisp
  const MAX_DIM = 420
  const gScale  = Math.min(1, MAX_DIM / Math.max(W, H))
  const gW      = Math.max(4, Math.floor(W * gScale))
  const gH      = Math.max(4, Math.floor(H * gScale))
  const size    = gW * gH

  // Seed selects a pattern family, then varies slightly within it
  const FAMILIES: [number, number, string][] = [
    [0.055, 0.062, 'coral'],       // fingerprints / coral
    [0.035, 0.060, 'spots'],       // pea-like spots
    [0.030, 0.057, 'maze'],        // labyrinthine maze
    [0.026, 0.051, 'cells'],       // bubbles / cells
    [0.039, 0.058, 'worms'],       // winding worms
    [0.014, 0.054, 'waves'],       // sparse travelling waves
  ]
  const [fBase, kBase] = FAMILIES[Math.floor(rng() * FAMILIES.length)]
  const feed = fBase + (rng() - 0.5) * 0.003
  const kill = kBase + (rng() - 0.5) * 0.002
  const Du   = 0.2097
  const Dv   = 0.1050

  // Double-buffered typed arrays for the two chemical concentrations
  let U  = new Float32Array(size).fill(1)
  let V  = new Float32Array(size).fill(0)
  let nU = new Float32Array(size)
  let nV = new Float32Array(size)

  // Seed circular blobs of V to kick off the reaction
  const blobs = Math.floor(4 + rng() * 8)
  for (let b = 0; b < blobs; b++) {
    const cx = Math.floor(rng() * gW)
    const cy = Math.floor(rng() * gH)
    const r  = Math.floor(2 + rng() * 5)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const ix = ((cx + dx) + gW) % gW
        const iy = ((cy + dy) + gH) % gH
        V[iy * gW + ix] = 1
        U[iy * gW + ix] = 0
      }
    }
  }

  // One Euler integration step with wrapping boundary
  const step = () => {
    for (let y = 0; y < gH; y++) {
      const yn = (y === 0      ? gH - 1 : y - 1) * gW
      const yc =  y * gW
      const yp = (y === gH - 1 ? 0      : y + 1) * gW
      for (let x = 0; x < gW; x++) {
        const i  = yc + x
        const xn = x === 0      ? gW - 1 : x - 1
        const xp = x === gW - 1 ? 0      : x + 1
        const u  = U[i], v = V[i]
        const lapU = U[yn + x] + U[yp + x] + U[yc + xn] + U[yc + xp] - 4 * u
        const lapV = V[yn + x] + V[yp + x] + V[yc + xn] + V[yc + xp] - 4 * v
        const uvv  = u * v * v
        nU[i] = Math.max(0, u + Du * lapU - uvv + feed * (1 - u))
        nV[i] = Math.max(0, v + Dv * lapV + uvv - (feed + kill) * v)
      }
    }
    ;[U, nU] = [nU, U]
    ;[V, nV] = [nV, V]
  }

  // Offscreen canvas — simulation runs at gW×gH, then scales up to canvas
  const off    = document.createElement('canvas')
  off.width    = gW
  off.height   = gH
  const offCtx = off.getContext('2d')!
  const img    = offCtx.createImageData(gW, gH)
  const px     = img.data

  const render = () => {
    for (let i = 0; i < size; i++) {
      // Smoothstep maps the V gradient to a crisp edge:
      // V < LO → 0, V > HI → 1, cubic transition in between
      const LO = 0.07, HI = 0.22
      const t = Math.max(0, Math.min(1, (V[i] - LO) / (HI - LO)))
      const v = t * t * (3 - 2 * t)
      const c = dark
        ? Math.round(v * 238)
        : Math.round((1 - v) * 232 + 12)
      const j = i * 4
      px[j] = px[j + 1] = px[j + 2] = c
      px[j + 3] = 255
    }
    offCtx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'medium'
    ctx.drawImage(off, 0, 0, W, H)
  }

  // More steps/frame on larger canvases (faster pattern emergence)
  const sPerFrame = Math.max(2, Math.min(6, Math.round(gW / 50)))
  let rafId: number

  const tick = () => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return
    for (let s = 0; s < sPerFrame; s++) step()
    render()
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// ── Truchet tiles ────────────────────────────────────────────────────────────
// Each cell holds one of two quarter-circle arc pairs. A slow noise drift
// causes tiles to gradually flip orientation, morphing the maze over time.
function runTruchet(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height
  const rng = mkRng(seed)

  const s         = Math.floor(18 + rng() * 22)            // tile size: 18–40 px
  const speed     = 0.00010 + rng() * 0.00016              // noise drift rate
  const threshold = 0.42    + rng() * 0.16                 // orientation split density
  const nScale    = (0.05   + rng() * 0.07) / s            // noise frequency per tile
  const lineW     = 1.0     + rng() * 1.0                  // stroke weight

  const noise = mkNoise(seed ^ 0x9F2E5A1B)

  const bg    = dark ? '#0e0e0e' : '#f3f3f3'
  const color = dark ? 'rgba(255,255,255,0.55)' : 'rgba(12,12,12,0.55)'

  const cols = Math.ceil(W / s) + 1
  const rows = Math.ceil(H / s) + 1

  let t = 0, lastNow = 0, rafId: number

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return

    t += (now - (lastNow || now)) * speed
    lastNow = now

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = color
    ctx.lineWidth = lineW
    ctx.lineCap = 'round'

    for (let row = 0; row < rows; row++) {
      const ty = row * s
      for (let col = 0; col < cols; col++) {
        const tx = col * s
        const n  = noise(col * nScale * s + t, row * nScale * s)

        ctx.beginPath()
        if (n < threshold) {
          // Orientation A — top↔left  and  bottom↔right
          ctx.arc(tx,     ty,     s / 2, 0,           Math.PI / 2)
          ctx.moveTo(tx + s / 2,  ty + s)
          ctx.arc(tx + s, ty + s, s / 2, Math.PI,     Math.PI * 1.5)
        } else {
          // Orientation B — top↔right  and  left↔bottom
          ctx.arc(tx + s, ty,     s / 2, Math.PI / 2, Math.PI)
          ctx.moveTo(tx,          ty + s / 2)
          ctx.arc(tx,     ty + s, s / 2, Math.PI * 1.5, Math.PI * 2)
        }
        ctx.stroke()
      }
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// ── Charge field ─────────────────────────────────────────────────────────────
// N point charges (mix of +/−) placed on canvas. At every point the electric
// field vector is the sum of each charge's contribution (sign · strength / r²).
// Particles follow those field lines — sources fan out, sinks converge, opposite
// pairs form the classic arc patterns of electromagnetic field diagrams.
function runChargeField(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height
  const rng = mkRng(seed)

  // ── Charges ────────────────────────────────────────────────────────────────
  const numCharges = Math.floor(2 + rng() * 4)           // 2–5 charges
  const useRing    = rng() > 0.38                         // 62 % ring, 38 % scatter

  interface Charge { x: number; y: number; sign: 1 | -1; strength: number }
  const charges: Charge[] = []

  if (useRing) {
    // Equally spaced on a circle, alternating +/−  →  symmetric dipole / quadrupole
    const cx = W / 2, cy = H / 2
    const r  = Math.min(W, H) * (0.18 + rng() * 0.22)
    const offset = rng() * Math.PI * 2
    for (let i = 0; i < numCharges; i++) {
      const angle = offset + (i / numCharges) * Math.PI * 2
      charges.push({
        x:        cx + r * Math.cos(angle),
        y:        cy + r * Math.sin(angle),
        sign:     i % 2 === 0 ? 1 : -1,
        strength: 0.8 + rng() * 0.4,
      })
    }
  } else {
    // Scattered — enforce minimum spacing so charges aren't on top of each other
    const margin  = Math.min(W, H) * 0.12
    const minDist = Math.min(W, H) * 0.22
    for (let i = 0; i < numCharges; i++) {
      let x = 0, y = 0, tries = 0
      do {
        x = margin + rng() * (W - 2 * margin)
        y = margin + rng() * (H - 2 * margin)
        tries++
      } while (tries < 40 && charges.some(c => Math.hypot(x - c.x, y - c.y) < minDist))
      charges.push({ x, y, sign: i % 2 === 0 ? 1 : -1, strength: 0.7 + rng() * 0.6 })
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  const count  = Math.floor(400 + rng() * 400)
  const speed  = (1.4 + rng() * 1.4) * (Math.min(W, H) / 400)
  const maxAge = Math.floor(80 + rng() * 100)

  type Particle = { x: number; y: number; age: number; life: number }
  const particles: Particle[] = Array.from({ length: count }, () => ({
    x:    rng() * W,
    y:    rng() * H,
    age:  Math.floor(rng() * maxAge),
    life: maxAge - 20 + Math.floor(rng() * 40),
  }))

  const bg = dark ? '#0e0e0e' : '#f3f3f3'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Compute normalised field direction at (x, y)
  const fieldDir = (x: number, y: number): [number, number] => {
    let fx = 0, fy = 0
    for (const c of charges) {
      const dx = x - c.x, dy = y - c.y
      const r2 = dx * dx + dy * dy
      const r3 = Math.max(r2 * Math.sqrt(r2), 1)      // clamp: no singularity at centre
      fx += c.sign * c.strength * dx / r3
      fy += c.sign * c.strength * dy / r3
    }
    const mag = Math.sqrt(fx * fx + fy * fy)
    return mag < 1e-9 ? [0, 0] : [fx / mag, fy / mag]
  }

  // Sink radius — reset particles that reach a negative charge centre
  const SINK_R2 = (Math.min(W, H) * 0.016) ** 2

  let rafId: number

  const tick = () => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return

    // Fade trail
    ctx.globalAlpha = 0.042
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
    ctx.lineWidth = 0.8

    for (const p of particles) {
      const [dx, dy] = fieldDir(p.x, p.y)
      const nx = p.x + dx * speed
      const ny = p.y + dy * speed

      const fadeIn  = Math.min(1, p.age / (p.life * 0.12))
      const fadeOut = (1 - p.age / p.life) < 0.4 ? (1 - p.age / p.life) / 0.4 : 1
      const alpha   = fadeIn * fadeOut * (dark ? 0.44 : 0.30)

      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(nx, ny)
      ctx.strokeStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(12,12,12,${alpha})`
      ctx.stroke()

      p.x = nx; p.y = ny; p.age++

      const atSink = charges.some(c => c.sign === -1 &&
        (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < SINK_R2)

      if (p.age >= p.life || nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8 || atSink) {
        p.x   = rng() * W
        p.y   = rng() * H
        p.age = 0
        p.life = maxAge - 20 + Math.floor(rng() * 40)
      }
    }

  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// ── Curl flow ────────────────────────────────────────────────────────────────
// Uses the curl (rotational derivative) of the noise field rather than its raw
// value.  curl = (∂N/∂y, −∂N/∂x) — mathematically divergence-free, so
// particles never bunch or thin: density stays perfectly even everywhere.
// Four seed-driven styles share the same core; each has a distinct character.
function runCurlFlow(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height
  const rng = mkRng(seed)

  // ── Style ─────────────────────────────────────────────────────────────────
  // 'hair'        dense fine strands  — the Anticyclone look
  // 'streams'     sparse long arcs    — swooping ribbons
  // 'turbulence'  multi-octave chaos  — layered interference
  // 'drift'       slow time-evolving  — field morphs over seconds
  const STYLES = ['hair', 'streams', 'turbulence', 'drift'] as const
  type Style   = typeof STYLES[number]
  const style: Style = STYLES[Math.floor(rng() * STYLES.length)]

  const count  = style === 'hair'        ? Math.floor(2800 + rng() * 2200) :
                 style === 'streams'     ? Math.floor(120  + rng() * 180)  :
                 style === 'turbulence'  ? Math.floor(1000 + rng() * 1500) :
                                          Math.floor(900  + rng() * 1100)

  const maxAge = style === 'hair'        ? Math.floor(18  + rng() * 22)  :
                 style === 'streams'     ? Math.floor(200 + rng() * 250) :
                 style === 'turbulence'  ? Math.floor(60  + rng() * 80)  :
                                          Math.floor(70  + rng() * 90)

  const numOcts = style === 'turbulence' ? Math.floor(2 + rng() * 3) : 1

  const cells  = style === 'streams'     ? 1.5 + rng() * 2.0  // zoomed-in → long arcs
               : style === 'hair'        ? 3.0 + rng() * 3.0
               :                          2.0 + rng() * 4.0
  const scale  = cells / Math.min(W, H)

  const speed  = (style === 'hair'   ? 1.8 + rng() * 1.2
               : style === 'streams' ? 1.0 + rng() * 1.0
               :                      1.2 + rng() * 1.2) * (Math.min(W, H) / 400)

  const driftRate = style === 'drift' ? 0.12 + rng() * 0.10   // noise-units / second
                  :                     0.02 + rng() * 0.03   // barely perceptible drift

  const noise = mkNoise(seed)
  const bg    = dark ? '#0e0e0e' : '#f3f3f3'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  type Particle = { x: number; y: number; age: number; life: number }
  const particles: Particle[] = Array.from({ length: count }, () => ({
    x:    rng() * W,
    y:    rng() * H,
    age:  Math.floor(rng() * maxAge),
    life: maxAge - 5 + Math.floor(rng() * 10),
  }))

  // Curl: estimated with central differences in noise-space
  const E = 0.12
  const curlAt = (x: number, y: number, t: number): [number, number] => {
    const cx = x * scale + t * driftRate
    const cy = y * scale
    let fx = 0, fy = 0, amp = 1.0, freq = 1.0
    for (let o = 0; o < numOcts; o++) {
      const f = freq
      fx += amp *  (noise(cx * f, cy * f + E) - noise(cx * f, cy * f - E))
      fy += amp * -(noise(cx * f + E, cy * f) - noise(cx * f - E, cy * f))
      amp  *= 0.5
      freq *= 2.1   // lacunarity — slightly off-integer avoids harmonic aliasing
    }
    const mag = Math.sqrt(fx * fx + fy * fy)
    return mag < 1e-9 ? [0, 0] : [fx / mag, fy / mag]
  }

  const trailAlpha = style === 'hair'    ? 0.055
                   : style === 'streams' ? 0.022
                   :                      0.038
  const strokeAlpha = dark
    ? (style === 'hair' ? 0.38 : style === 'streams' ? 0.52 : 0.42)
    : (style === 'hair' ? 0.25 : style === 'streams' ? 0.38 : 0.30)
  const lw = style === 'hair' ? 0.6 : 0.85

  let t = 0, lastNow = 0, rafId: number

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return

    t += (now - (lastNow || now)) / 1000
    lastNow = now

    ctx.globalAlpha = trailAlpha
    ctx.fillStyle   = bg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
    ctx.lineWidth   = lw

    for (const p of particles) {
      const [dx, dy] = curlAt(p.x, p.y, t)
      const nx = p.x + dx * speed
      const ny = p.y + dy * speed

      const fadeIn  = Math.min(1, p.age / (p.life * 0.15))
      const fadeOut = (1 - p.age / p.life) < 0.4 ? (1 - p.age / p.life) / 0.4 : 1
      const alpha   = fadeIn * fadeOut * strokeAlpha

      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(nx, ny)
      ctx.strokeStyle = dark ? `rgba(255,255,255,${alpha})` : `rgba(12,12,12,${alpha})`
      ctx.stroke()

      p.x = nx; p.y = ny; p.age++

      if (p.age >= p.life || nx < -10 || nx > W + 10 || ny < -10 || ny > H + 10) {
        p.x   = rng() * W
        p.y   = rng() * H
        p.age = 0
        p.life = maxAge - 5 + Math.floor(rng() * 10)
      }
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// ── Strange attractor ─────────────────────────────────────────────────────────
// Iterates algebraic attractor formulas (Clifford, De Jong, Svensson) millions of
// times, accumulating a density histogram rendered with log-scale mapping.
// The shape "crystallises" over the first few seconds as density builds up.
function runStrangeAttractor(
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const W = canvas.width, H = canvas.height
  const rng = mkRng(seed)

  // ── Pick attractor type ────────────────────────────────────────────────────
  const TYPES = ['clifford', 'dejong', 'svensson'] as const
  type AttType = typeof TYPES[number]
  const attType: AttType = TYPES[Math.floor(rng() * TYPES.length)]

  const rv = (lo: number, hi: number) => lo + rng() * (hi - lo)
  let a: number, b: number, c: number, d: number
  if (attType === 'clifford') {
    a = rv(-2, 2); b = rv(-2, 2); c = rv(-2, 2); d = rv(-2, 2)
  } else if (attType === 'dejong') {
    a = rv(-3, 3); b = rv(-3, 3); c = rv(-3, 3); d = rv(-3, 3)
  } else {
    a = rv(-3, 3); b = rv(-3, 3); c = rv(-3, 3); d = rv(-3, 3)
  }

  const iterate = (x: number, y: number): [number, number] => {
    if (attType === 'clifford')
      return [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)]
    if (attType === 'dejong')
      return [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)]
    return [d * Math.sin(a * x) - Math.sin(b * y), c * Math.cos(a * x) + Math.cos(b * y)]
  }

  // ── Warmup + bounds estimation ─────────────────────────────────────────────
  let x = rv(-0.2, 0.2), y = rv(-0.2, 0.2)
  for (let i = 0; i < 300; i++) [x, y] = iterate(x, y)   // burn off transient

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  let wx = x, wy = y
  for (let i = 0; i < 5000; i++) {
    [wx, wy] = iterate(wx, wy)
    if (wx < minX) minX = wx; if (wx > maxX) maxX = wx
    if (wy < minY) minY = wy; if (wy > maxY) maxY = wy
  }

  if (!isFinite(minX) || (maxX - minX) < 0.01 || (maxY - minY) < 0.01) {
    ctx.fillStyle = dark ? '#0e0e0e' : '#f3f3f3'
    ctx.fillRect(0, 0, W, H)
    return () => {}
  }

  const padX = (maxX - minX) * 0.12, padY = (maxY - minY) * 0.12
  minX -= padX; maxX += padX; minY -= padY; maxY += padY

  // ── Histogram grid ─────────────────────────────────────────────────────────
  const MAX_DIM = 700
  const aspect = W / H
  const gW = Math.max(1, Math.round(aspect >= 1 ? MAX_DIM : MAX_DIM * aspect))
  const gH = Math.max(1, Math.round(aspect >= 1 ? MAX_DIM / aspect : MAX_DIM))

  const hist = new Float32Array(gW * gH)
  let maxCount = 1

  const toGX = (ax: number) => Math.round(((ax - minX) / (maxX - minX)) * (gW - 1))
  const toGY = (ay: number) => Math.round(((ay - minY) / (maxY - minY)) * (gH - 1))

  // ── Offscreen canvas ───────────────────────────────────────────────────────
  const off = document.createElement('canvas')
  off.width = gW; off.height = gH
  const offCtx = off.getContext('2d')!
  const imgData = offCtx.createImageData(gW, gH)
  const pxArr = imgData.data

  const render = () => {
    const logMax = Math.log(maxCount + 1)
    for (let i = 0; i < gW * gH; i++) {
      const cnt = hist[i]
      const j = i * 4
      let v: number
      if (cnt === 0) {
        v = dark ? 14 : 243
      } else {
        const t = Math.pow(Math.log(cnt + 1) / logMax, 0.55)
        v = dark
          ? Math.round(14  + t * (248 - 14))
          : Math.round(243 - t * (243 - 10))
      }
      pxArr[j] = pxArr[j + 1] = pxArr[j + 2] = v
      pxArr[j + 3] = 255
    }
    offCtx.putImageData(imgData, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(off, 0, 0, W, H)
  }

  ctx.fillStyle = dark ? '#0e0e0e' : '#f3f3f3'
  ctx.fillRect(0, 0, W, H)

  const ITERS_PER_FRAME = 80000
  let rafId: number

  const tick = () => {
    rafId = requestAnimationFrame(tick)
    if (document.hidden || isPaused()) return

    for (let i = 0; i < ITERS_PER_FRAME; i++) {
      [x, y] = iterate(x, y)
      if (!isFinite(x) || !isFinite(y)) { x = 0.1; y = 0.1; continue }
      const gx = toGX(x), gy = toGY(y)
      if (gx >= 0 && gx < gW && gy >= 0 && gy < gH) {
        const idx = gy * gW + gx
        const v = ++hist[idx]
        if (v > maxCount) maxCount = v
      }
    }

    render()
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// ── Algorithm registry ───────────────────────────────────────────────────────
type Runner = (
  canvas: HTMLCanvasElement,
  seed: number,
  dark: boolean,
  isPaused: () => boolean,
) => () => void

const RUNNERS: Record<GenArtType, Runner> = {
  'flow-field':          runFlowField,
  'reaction-diffusion':  runReactionDiffusion,
  'truchet':             runTruchet,
  'charge-field':        runChargeField,
  'curl-flow':           runCurlFlow,
  'strange-attractor':   runStrangeAttractor,
}

// ── Component ────────────────────────────────────────────────────────────────
export interface GenArtProps {
  type?:      GenArtType
  seed?:      number
  paused?:    boolean
  style?:     React.CSSProperties
  className?: string
}

export default function GenArt({ type = 'flow-field', seed: seedProp, paused, style, className }: GenArtProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const stopRef    = useRef<(() => void) | null>(null)
  const pausedRef  = useRef(paused ?? false)
  const [seed,    setSeed]    = useState(() => seedProp ?? Math.floor(Math.random() * 0xFFFFFF))
  const [hovered, setHovered] = useState(false)
  const [dark,    setDark]    = useState(false)

  // Keep pausedRef in sync without restarting the canvas
  useEffect(() => { pausedRef.current = paused ?? false }, [paused])

  useEffect(() => { if (seedProp !== undefined) setSeed(seedProp) }, [seedProp])

  // Track dark mode
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'))
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Start / restart on seed or theme change
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    const start = () => {
      const nextWidth  = Math.max(1, Math.round(wrap.offsetWidth))
      const nextHeight = Math.max(1, Math.round(wrap.offsetHeight))
      if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return

      canvas.width  = nextWidth
      canvas.height = nextHeight
      stopRef.current?.()
      stopRef.current = RUNNERS[type](canvas, seed, dark, () => pausedRef.current)
    }

    start()
    const ro = new ResizeObserver(start)
    ro.observe(wrap)
    return () => { stopRef.current?.(); ro.disconnect() }
  }, [type, seed, dark])

  const reseed = useCallback(() => setSeed(Math.floor(Math.random() * 0xFFFFFF)), [])

  return (
    <div
      ref={wrapRef}
      onClick={reseed}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', ...style }}
      className={className}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{
        position:      'absolute',
        bottom:         10,
        right:          12,
        fontFamily:    'var(--fonts-mono)',
        fontSize:       9,
        letterSpacing: '0.06em',
        color:         'var(--colors-gray8)',
        opacity:        hovered ? 1 : 0,
        transition:    'opacity 200ms ease',
        pointerEvents: 'none',
        userSelect:    'none',
      }}>
        {seed.toString(16).padStart(6, '0')} · click to reseed
      </div>
    </div>
  )
}
