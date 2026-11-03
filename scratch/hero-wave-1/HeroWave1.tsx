// THROWAWAY — wave 1 hero prototype. Not production polish.
// Two whole shapes behind one switcher so they can be felt in the same preview.
//   /prototype/hero            the world (default)
//   /prototype/hero?v=host     the host (a cctv that pans and tilts toward the pointer)
// Keys 1 and 2 swap shapes. Live home (/) is untouched.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

const SignalField = dynamic(() => import('../../components/SignalField'), { ssr: false })

type HeroShape = 'world' | 'host'

const LINES = [
  'data engineer at databricks.',
  'also responsible for whatever this is.',
]

const TRAILS: { href: string; label: string; aside: string }[] = [
  { href: '/work', label: 'work', aside: 'systems' },
  { href: '/craft', label: 'craft', aside: 'generative' },
  { href: '/play', label: 'play', aside: 'arcade' },
]

// Pan/tilt limits, degrees. The housing cannot wind past the mount.
const YAW_LIMIT: [number, number] = [-46, 42]
const PITCH_LIMIT: [number, number] = [-24, 28]

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function useHeroShape(): [HeroShape | null, (next: HeroShape) => void] {
  const router = useRouter()
  const [shape, setShapeState] = useState<HeroShape | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    setShapeState(router.query.v === 'host' ? 'host' : 'world')
  }, [router.isReady, router.query.v])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === '1') setShape('world')
      if (e.key === '2') setShape('host')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // setShape closes over the current router; rebinding on router identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  function setShape(next: HeroShape) {
    setShapeState(next)
    router.replace(
      { pathname: '/prototype/hero', query: { v: next } },
      undefined,
      { shallow: true, scroll: false },
    )
  }

  return [shape, setShape]
}

function useMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

function useVeniceClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).formatToParts(new Date())
      const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
      const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
      const second = parts.find((part) => part.type === 'second')?.value ?? ''
      const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value.toLowerCase() ?? ''
      return `${hour}:${minute}:${second} ${dayPeriod}`
    }
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function Switcher({ shape, onChange }: { shape: HeroShape | null; onChange: (next: HeroShape) => void }) {
  const mobile = useMobile()
  const options: { id: HeroShape; label: string; key: string }[] = [
    { id: 'world', label: 'the world', key: '1' },
    { id: 'host', label: 'the host', key: '2' },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Hero prototype shapes"
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: mobile ? 8 : 14,
        padding: mobile ? '6px 10px' : '6px 12px',
        borderRadius: 999,
        background: 'var(--colors-gray2)',
        border: '1px solid var(--colors-grayA4)',
        backdropFilter: 'blur(16px)',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <span style={quiet}>prototype</span>
      {options.map((option) => {
        const on = shape === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.id)}
            style={{
              fontFamily: 'var(--fonts-body)',
              fontSize: mobile ? 11 : 12,
              letterSpacing: '0.01em',
              textTransform: 'lowercase',
              whiteSpace: 'nowrap',
              color: on ? 'var(--colors-gray12)' : 'var(--colors-gray8)',
              cursor: 'pointer',
              padding: '4px 2px',
            }}
          >
            {option.label}
            <span style={{ ...quiet, marginLeft: 6 }}>{option.key}</span>
          </button>
        )
      })}
    </div>
  )
}

const quiet: CSSProperties = {
  fontFamily: 'var(--fonts-body)',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'lowercase',
  color: 'var(--colors-gray8)',
}

function TextLink({
  href,
  label,
  size = 15,
  dim = 'var(--colors-gray11)',
  onHover,
  onLeave,
}: {
  href: string
  label: string
  size?: number
  dim?: string
  onHover?: () => void
  onLeave?: () => void
}) {
  const [on, setOn] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => { setOn(true); onHover?.() }}
      onMouseLeave={() => { setOn(false); onLeave?.() }}
      onFocus={() => { setOn(true); onHover?.() }}
      onBlur={() => { setOn(false); onLeave?.() }}
      style={{
        fontFamily: 'var(--fonts-body)',
        fontSize: size,
        lineHeight: '22px',
        letterSpacing: '-0.01em',
        textTransform: 'lowercase',
        color: on ? 'var(--colors-gray12)' : dim,
        transition: 'color 150ms ease',
      }}
    >
      {label}
    </Link>
  )
}

function WorldShape() {
  const mobile = useMobile()
  const reduced = useReducedMotion()
  const time = useVeniceClock()
  return (
    <div data-shape="world">
      <SignalField mode="bots" effect={['clouds']} scene="nature" />
      <div
        style={{
          position: 'fixed',
          zIndex: 2,
          left: 0,
          bottom: 108,
          width: 'min(560px, 100%)',
          padding: mobile ? '22px 22px 22px 22px' : '28px 64px 28px max(28px, 6vw)',
          background: 'linear-gradient(90deg, var(--colors-gray1) 0%, transparent 92%)',
          pointerEvents: 'none',
        }}
      >
        <motion.div
          style={{ pointerEvents: 'auto' }}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <p style={{ ...quiet, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
            {time ? `${time}  ·  venice, california` : 'venice, california'}
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--fonts-body)',
              fontWeight: 500,
              fontSize: mobile ? 34 : 48,
              lineHeight: 1,
              letterSpacing: '-0.035em',
              textTransform: 'lowercase',
              color: 'var(--colors-gray12)',
            }}
          >
            ben sack
          </h1>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {LINES.map((line) => (
              <p
                key={line}
                style={{
                  margin: 0,
                  fontFamily: 'var(--fonts-body)',
                  fontSize: mobile ? 16 : 18,
                  lineHeight: mobile ? '24px' : '26px',
                  letterSpacing: '-0.02em',
                  textTransform: 'lowercase',
                  color: 'var(--colors-gray11)',
                }}
              >
                {line}
              </p>
            ))}
          </div>
          <nav
            aria-label="Go"
            style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 18 }}
          >
            {TRAILS.map((trail) => (
              <TextLink key={trail.href} href={trail.href} label={trail.label} size={16} dim="var(--colors-gray12)" />
            ))}
          </nav>
        </motion.div>
      </div>
    </div>
  )
}

function Cctv({ mobile }: { mobile: boolean }) {
  const reduced = useReducedMotion()
  const time = useVeniceClock()
  const pivotRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const aim = useRef({ x: 0, y: 0, live: false })
  const yaw = useRef(12)
  const pitch = useRef(-4)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      aim.current = { x: e.clientX, y: e.clientY, live: true }
    }
    window.addEventListener('pointermove', onMove)
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) aim.current.live = false
    }
    window.addEventListener('pointerout', onOut)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onOut)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const pivot = pivotRef.current
      let ty = 14
      let tp = -4
      if (!reduced && aim.current.live && pivot) {
        const rect = pivot.getBoundingClientRect()
        const dx = aim.current.x - (rect.left + rect.width / 2)
        const dy = aim.current.y - (rect.top + rect.height / 2)
        const depth = 320
        // Lens sits on the right end of the barrel. Positive yaw swings it right.
        ty = clamp(Math.atan2(dx, depth) * (180 / Math.PI), YAW_LIMIT[0], YAW_LIMIT[1])
        tp = clamp(Math.atan2(dy, depth) * (180 / Math.PI), PITCH_LIMIT[0], PITCH_LIMIT[1])
      } else if (!reduced) {
        const t = now / 1000
        ty = Math.sin(t * 0.42) * 22
        tp = Math.sin(t * 0.23) * 6 - 3
      }
      const k = reduced ? 1 : 0.075
      yaw.current += (ty - yaw.current) * k
      pitch.current += (tp - pitch.current) * k
      if (panRef.current) panRef.current.style.transform = `rotateY(${yaw.current.toFixed(2)}deg)`
      if (tiltRef.current) tiltRef.current.style.transform = `rotateX(${pitch.current.toFixed(2)}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const scale = mobile ? 0.78 : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, flexShrink: 0, pointerEvents: 'none' }}>
      <span className="vh">security camera</span>
      <div style={{ width: 230 * scale, height: 248 * scale }}>
        <div style={{ width: 230, height: 248, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative' }}>
          <div style={poleStyle} />
          <div style={armStyle} />
          <div style={knuckleStyle} />
          <div style={boltStyle} />
          <div ref={pivotRef} style={pivotStyle}>
            <div ref={panRef} style={jointStyle}>
              <div ref={tiltRef} style={jointStyle}>
                <div style={hoodStyle} />
                <div style={barrelStyle} />
                <div style={bezelStyle}>
                  <div style={lensStyle} />
                  <div style={glintStyle} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p style={{ ...mono, fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>
        {time ? `${time}  ·  venice` : 'venice'}
      </p>
    </div>
  )
}

const metal = 'linear-gradient(180deg, #f3f0e8 0%, #d8d2c6 46%, #b7b1a4 100%)'
const metalDark = 'linear-gradient(180deg, #cfc8bb 0%, #a39d92 100%)'

const poleStyle: CSSProperties = {
  position: 'absolute',
  left: 22,
  top: 36,
  width: 18,
  height: 206,
  borderRadius: 2,
  background: 'repeating-linear-gradient(to bottom, #c4beb2 0 3px, #8f897e 3px 6px)',
  boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.18)',
}

const armStyle: CSSProperties = {
  position: 'absolute',
  left: 32,
  top: 118,
  width: 78,
  height: 16,
  borderRadius: 3,
  background: metal,
  boxShadow: '0 2px 0 #8d877c',
}

const knuckleStyle: CSSProperties = {
  position: 'absolute',
  left: 10,
  top: 108,
  width: 40,
  height: 36,
  borderRadius: 8,
  background: metalDark,
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
}

const boltStyle: CSSProperties = {
  position: 'absolute',
  left: 24,
  top: 120,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 35%, #eeeae2, #6d675e 70%)',
  zIndex: 1,
}

const pivotStyle: CSSProperties = {
  position: 'absolute',
  left: 92,
  top: 78,
  width: 20,
  height: 20,
  perspective: 640,
}

const jointStyle: CSSProperties = {
  position: 'relative',
  width: 20,
  height: 20,
  transformStyle: 'preserve-3d',
  transformOrigin: '10px 16px',
}

const hoodStyle: CSSProperties = {
  position: 'absolute',
  left: 28,
  top: -18,
  width: 86,
  height: 22,
  borderRadius: '3px 12px 2px 2px',
  background: 'linear-gradient(180deg, #b7b1a4, #8a8478)',
  transform: 'translateZ(8px)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset',
}

const barrelStyle: CSSProperties = {
  position: 'absolute',
  left: 8,
  top: -8,
  width: 112,
  height: 40,
  borderRadius: '6px 22px 22px 6px',
  background: metal,
  boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.28)',
}

const bezelStyle: CSSProperties = {
  position: 'absolute',
  left: 102,
  top: -2,
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 40% 40%, #3a3a3a, #111 62%, #000)',
  boxShadow: '0 0 0 3px #8d877c, inset 0 0 0 2px #1a1a1a',
  transform: 'translateZ(6px)',
}

const lensStyle: CSSProperties = {
  position: 'absolute',
  left: 9,
  top: 9,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 40% 38%, #6a6a6a, #0c0c0c 70%)',
}

const glintStyle: CSSProperties = {
  position: 'absolute',
  left: 13,
  top: 11,
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.55)',
}

const mono: CSSProperties = {
  margin: 0,
  fontFamily: 'Menlo, "Courier New", monospace',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'lowercase',
  color: 'var(--colors-gray10)',
}

function HostShape() {
  const mobile = useMobile()
  const reduced = useReducedMotion()
  const [aside, setAside] = useState<string | null>(null)

  return (
    <div data-shape="host">
      <div style={{ opacity: 0.34 }}>
        <SignalField mode="bots" effect={['clouds']} scene="nature" fullControls={false} />
      </div>
      <div
        style={{
          position: 'fixed',
          zIndex: 2,
          left: mobile ? 20 : 'max(28px, 7vw)',
          right: mobile ? 20 : 'auto',
          top: '46%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          alignItems: mobile ? 'flex-start' : 'center',
          gap: mobile ? 22 : 48,
          maxWidth: mobile ? 'none' : 860,
          width: mobile ? 'auto' : 'min(860px, calc(100vw - 12vw))',
        }}
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Cctv mobile={mobile} />
        </motion.div>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduced ? 0 : 0.08, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}
        >
          <div>
            <h1 style={hostLine(mobile, 'var(--colors-gray12)', true)}>ben sack</h1>
            {LINES.map((line) => (
              <p key={line} style={hostLine(mobile, 'var(--colors-gray11)')}>{line}</p>
            ))}
          </div>
          <nav aria-label="Go" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            {TRAILS.map((trail) => (
              <span key={trail.href} style={{ display: 'flex', alignItems: 'baseline', gap: 14, minHeight: 22 }}>
                <TextLink
                  href={trail.href}
                  label={trail.label}
                  size={mobile ? 16 : 18}
                  dim="var(--colors-gray12)"
                  onHover={() => setAside(trail.aside)}
                  onLeave={() => setAside(null)}
                />
                <span aria-hidden style={{ ...mono, opacity: aside === trail.aside ? 1 : 0 }}>{trail.aside}</span>
              </span>
            ))}
          </nav>
        </motion.div>
      </div>
    </div>
  )
}

function hostLine(mobile: boolean, color: string, name = false): CSSProperties {
  return {
    margin: 0,
    fontFamily: 'var(--fonts-body)',
    fontWeight: name ? 500 : 400,
    fontSize: name ? (mobile ? 28 : 34) : (mobile ? 15 : 17),
    lineHeight: name ? 1.05 : (mobile ? '22px' : '26px'),
    letterSpacing: name ? '-0.03em' : '-0.02em',
    textTransform: 'lowercase',
    color,
  }
}

export default function HeroWave1() {
  const [shape, setShape] = useHeroShape()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <>
      <Head>
        <title>Hero prototype — Ben Sack</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Switcher shape={shape} onChange={setShape} />
      {shape === 'world' && <WorldShape />}
      {shape === 'host' && <HostShape />}
    </>
  )
}
