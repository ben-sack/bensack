// THROWAWAY — bio placement prototype. Not production polish.
// Same meadow, same copy, four positions. Live home (/) is untouched.
//   /prototype/hero            lower left (default)
//   /prototype/hero?v=upper    upper left
//   /prototype/hero?v=center   centered over the field
//   /prototype/hero?v=dock     bottom, flush with the dock
// Keys 1–4 swap. The host / camera experiments are not on this route.

import { useEffect, useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

const SignalField = dynamic(() => import('../../components/SignalField'), { ssr: false })

type Place = 'lower' | 'upper' | 'center' | 'dock'

const PLACES: { id: Place; label: string; key: string }[] = [
  { id: 'lower', label: 'lower', key: '1' },
  { id: 'upper', label: 'upper', key: '2' },
  { id: 'center', label: 'center', key: '3' },
  { id: 'dock', label: 'dock', key: '4' },
]

const LINES = [
  'data engineer at databricks.',
  'also responsible for whatever this is.',
]

const TRAILS = [
  { href: '/work', label: 'work' },
  { href: '/craft', label: 'craft' },
  { href: '/play', label: 'play' },
]

function isPlace(value: string | undefined): value is Place {
  return value === 'lower' || value === 'upper' || value === 'center' || value === 'dock'
}

function usePlace(): [Place | null, (next: Place) => void] {
  const router = useRouter()
  const [place, setPlaceState] = useState<Place | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    const raw = Array.isArray(router.query.v) ? router.query.v[0] : router.query.v
    // Old world link still lands on the lower-left sign.
    setPlaceState(raw === 'world' || raw == null ? 'lower' : isPlace(raw) ? raw : 'lower')
  }, [router.isReady, router.query.v])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const index = Number(e.key) - 1
      if (index >= 0 && index < PLACES.length) setPlace(PLACES[index].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // setPlace closes over the current router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  function setPlace(next: Place) {
    setPlaceState(next)
    router.replace(
      { pathname: '/prototype/hero', query: { v: next } },
      undefined,
      { shallow: true, scroll: false },
    )
  }

  return [place, setPlace]
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

const quiet: CSSProperties = {
  fontFamily: 'var(--fonts-body)',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'lowercase',
  color: 'var(--colors-gray8)',
}

function Switcher({ place, onChange }: { place: Place | null; onChange: (next: Place) => void }) {
  const mobile = useMobile()
  return (
    <div
      role="radiogroup"
      aria-label="Bio placement"
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
      {!mobile && <span style={quiet}>placement</span>}
      {PLACES.map((option) => {
        const on = place === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={option.id === 'dock' ? 'flush with the dock' : option.id === 'center' ? 'centered' : `${option.label} left`}
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

function TextLink({ href, label }: { href: string; label: string }) {
  const [on, setOn] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      onFocus={() => setOn(true)}
      onBlur={() => setOn(false)}
      style={{
        fontFamily: 'var(--fonts-body)',
        fontSize: 16,
        lineHeight: '22px',
        letterSpacing: '-0.01em',
        textTransform: 'lowercase',
        color: on ? 'var(--colors-gray12)' : 'var(--colors-gray12)',
        opacity: on ? 1 : 0.72,
        transition: 'opacity 150ms ease',
      }}
    >
      {label}
    </Link>
  )
}

function frameStyle(place: Place, mobile: boolean): CSSProperties {
  if (place === 'upper') {
    return {
      position: 'fixed',
      zIndex: 2,
      left: 0,
      top: 62,
      width: 'min(520px, 100%)',
      padding: mobile ? '16px 22px 24px' : '12px 64px 28px max(28px, 6vw)',
      background: 'linear-gradient(90deg, var(--colors-gray1) 0%, transparent 88%)',
      textAlign: 'left',
    }
  }
  if (place === 'center') {
    return {
      position: 'fixed',
      zIndex: 2,
      left: '50%',
      top: '38%',
      transform: 'translate(-50%, -50%)',
      width: 'min(460px, calc(100vw - 48px))',
      padding: '32px 28px',
      textAlign: 'center',
      background: 'radial-gradient(closest-side, var(--colors-gray1), transparent 78%)',
    }
  }
  if (place === 'dock') {
    return {
      position: 'fixed',
      zIndex: 2,
      left: '50%',
      bottom: 88,
      transform: 'translateX(-50%)',
      width: 'min(520px, calc(100vw - 32px))',
      padding: '36px 12px 6px',
      textAlign: 'center',
      background: 'linear-gradient(to top, var(--colors-gray1) 0%, transparent 100%)',
    }
  }
  return {
    position: 'fixed',
    zIndex: 2,
    left: 0,
    bottom: 108,
    width: 'min(520px, 100%)',
    padding: mobile ? '22px' : '28px 64px 28px max(28px, 6vw)',
    background: 'linear-gradient(90deg, var(--colors-gray1) 0%, transparent 92%)',
    textAlign: 'left',
  }
}

function Bio({ place }: { place: Place }) {
  const mobile = useMobile()
  const time = useVeniceClock()
  const centered = place === 'center' || place === 'dock'
  return (
    <div data-place={place} style={frameStyle(place, mobile)}>
      <p style={{ ...quiet, margin: 0, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
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
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: centered ? 'center' : 'flex-start',
          gap: 18,
          marginTop: 16,
        }}
      >
        {TRAILS.map((trail) => (
          <TextLink key={trail.href} href={trail.href} label={trail.label} />
        ))}
      </nav>
    </div>
  )
}

export default function HeroWave1() {
  const [place, setPlace] = usePlace()

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
      <SignalField mode="bots" effect={['clouds']} scene="nature" />
      <Switcher place={place} onChange={setPlace} />
      {place && <Bio place={place} />}
    </>
  )
}
