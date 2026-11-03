// THROWAWAY — wave 1 hero prototype. Not production polish.
// Two whole shapes behind one switcher so they can be felt in the same preview.
//   /prototype/hero            the world (default)
//   /prototype/hero?v=host     the host
// Keys 1 and 2 swap shapes. Live home (/) is untouched.

import { useEffect, useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import { BUDDY_BODIES } from '../../lib/buddies'
import { ZONES } from '../../lib/zones'

const SignalField = dynamic(() => import('../../components/SignalField'), { ssr: false })

type HeroShape = 'world' | 'host'

const sage = ZONES.nature.npcs.find((n) => n.id === 'nature-sage')
const GREETING = sage?.lines[0] ?? '...take your time out here.'
const GUIDE = sage?.lines[1] ?? 'everything ben makes is one trail away.'

const BIO = [
  'ben sack. data engineer at databricks.',
  'also responsible for whatever this is.',
]

const TRAILS = [
  { href: '/work', label: 'work' },
  { href: '/craft', label: 'craft' },
  { href: '/play', label: 'play' },
]

const REPLIES: { href: string; label: string; aside: string }[] = [
  { href: '/work', label: 'work', aside: 'the systems he actually ships.' },
  { href: '/craft', label: 'craft', aside: 'the pretty little experiments.' },
  { href: '/play', label: 'the arcade', aside: "pip's hiding a tiny one back there." },
]

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
            the meadow
          </h1>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {BIO.map((line) => (
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
            aria-label="Trails"
            style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}
          >
            <span style={quiet}>↳</span>
            {TRAILS.map((trail) => (
              <TextLink key={trail.href} href={trail.href} label={trail.label} size={16} dim="var(--colors-gray12)" />
            ))}
          </nav>
        </motion.div>
      </div>
    </div>
  )
}

function SageSprite({ mobile }: { mobile: boolean }) {
  const [frame, setFrame] = useState(0)
  const [eye, setEye] = useState('·')
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setFrame((current) => (current + 1) % BUDDY_BODIES.turtle.length), 680)
    return () => clearInterval(id)
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setEye('-')
      window.setTimeout(() => setEye('·'), 140)
    }, 3400)
    return () => clearInterval(id)
  }, [reduced])

  const lines = BUDDY_BODIES.turtle[frame]
    .map((line) => line.replace(/·/g, eye))
    .filter((line, index) => !(index === 0 && line.trim() === ''))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={quiet}>{sage?.name ?? 'sage'}</span>
      <pre
        aria-hidden
        style={{
          margin: 0,
          fontFamily: 'Menlo, "Courier New", monospace',
          fontSize: mobile ? 22 : 40,
          lineHeight: 1.08,
          color: 'var(--colors-gray12)',
          userSelect: 'none',
        }}
      >
        {lines.join('\n')}
      </pre>
    </div>
  )
}

function HostShape() {
  const mobile = useMobile()
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(reduced ? 3 : 0)
  const [aside, setAside] = useState<string | null>(null)

  useEffect(() => {
    if (reduced) { setBeat(3); return }
    setBeat(0)
    const timers = [
      window.setTimeout(() => setBeat(1), 280),
      window.setTimeout(() => setBeat(2), 900),
      window.setTimeout(() => setBeat(3), 1600),
    ]
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [reduced])

  const guideLine = aside ?? GUIDE

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
          gap: mobile ? 18 : 36,
          maxWidth: mobile ? 'none' : 820,
          width: mobile ? 'auto' : 'min(820px, calc(100vw - 12vw))',
        }}
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <h1 className="vh">sage</h1>
          <SageSprite mobile={mobile} />
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            {beat >= 1 && (
              <motion.p
                key="greet"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={hostLine(mobile, 'var(--colors-gray12)')}
              >
                {GREETING}
              </motion.p>
            )}
          </AnimatePresence>
          {beat >= 2 && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {BIO.map((line) => (
                <p key={line} style={hostLine(mobile, 'var(--colors-gray11)')}>{line}</p>
              ))}
            </motion.div>
          )}
          {beat >= 3 && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={guideLine}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={hostLine(mobile, 'var(--colors-gray10)')}
                >
                  {guideLine}
                </motion.p>
              </AnimatePresence>
              <nav aria-label="Ask sage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                {REPLIES.map((reply) => (
                  <span key={reply.href} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={quiet}>↳</span>
                    <TextLink
                      href={reply.href}
                      label={reply.label}
                      size={mobile ? 16 : 18}
                      onHover={() => setAside(reply.aside)}
                      onLeave={() => setAside(null)}
                    />
                  </span>
                ))}
              </nav>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function hostLine(mobile: boolean, color: string): CSSProperties {
  return {
    margin: 0,
    fontFamily: 'var(--fonts-body)',
    fontSize: mobile ? 16 : 20,
    lineHeight: mobile ? '24px' : '28px',
    letterSpacing: '-0.02em',
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
