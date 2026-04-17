import { useEffect, useRef, useState } from 'react'
import SEO from '../components/SEO'

// ─── Letter shuffle ────────────────────────────────────────────────────────
function shuffleLetters(el: HTMLElement, options: { iterations?: number } = {}) {
  const { iterations = 8 } = options
  const chars = 'abcdefghijklmnopqrstuvwxyz·—∙'
  const original = el.textContent ?? ''
  const letters = original.split('')
  const nonSpace = letters.reduce<number[]>((acc, c, i) => {
    if (!/\s/.test(c)) acc.push(i)
    return acc
  }, [])
  let timer: ReturnType<typeof setTimeout>
  function step(round: number) {
    if (round > nonSpace.length) { el.textContent = original; return }
    const cur = [...letters]
    for (let i = Math.max(round, 0); i < nonSpace.length; i++) {
      cur[nonSpace[i]] = i < round + iterations
        ? chars[Math.floor(Math.random() * chars.length)]
        : ''
    }
    el.textContent = cur.join('')
    timer = setTimeout(() => step(round + 1), 1000 / 30)
  }
  step(-iterations)
  return () => clearTimeout(timer)
}

// ─── Dot ──────────────────────────────────────────────────────────────────────
function Dot() {
  return <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: 'var(--colors-gray8)', flexShrink: 0, alignSelf: 'center' }} />
}

// ─── Time + location ──────────────────────────────────────────────────────────
function TimeLocation() {
  const headerRef      = useRef<HTMLElement>(null)
  const timeRef        = useRef<HTMLSpanElement>(null)
  const locationRef    = useRef<HTMLSpanElement>(null)
  const visitorRef     = useRef<HTMLSpanElement>(null)
  const [mounted,      setMounted]      = useState(false)
  const [time,         setTime]         = useState('')
  const [visitor,      setVisitor]      = useState<{ city: string; country: string } | null>(null)
  const [countryName,  setCountryName]  = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric', minute: '2-digit', second: '2-digit',
    })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('https://ipinfo.io/json?token=')
      .then((r) => r.json())
      .then((d: { city?: string; country?: string }) => {
        if (d.city && d.country) setVisitor({ city: d.city, country: d.country })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!visitor?.country) return
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' })
      setCountryName(dn.of(visitor.country) ?? visitor.country)
    } catch { setCountryName(visitor.country) }
  }, [visitor])

  useEffect(() => {
    if (!mounted) return
    if (headerRef.current) headerRef.current.style.opacity = '1'
    if (timeRef.current)     shuffleLetters(timeRef.current,     { iterations: 10 })
    if (locationRef.current) shuffleLetters(locationRef.current, { iterations: 10 })
    if (visitorRef.current)  shuffleLetters(visitorRef.current,  { iterations: 10 })
  }, [mounted])

  useEffect(() => {
    if (mounted && visitor && visitorRef.current) {
      shuffleLetters(visitorRef.current, { iterations: 10 })
    }
  }, [visitor, mounted])

  if (!mounted) return <div style={{ height: 24, marginBottom: 16 }} />

  const base: React.CSSProperties = {
    fontSize: 13,
    lineHeight: '24px',
    color: 'var(--colors-gray10)',
    fontFamily: 'var(--fonts-body)',
    textTransform: 'lowercase',
    whiteSpace: 'nowrap',
  }

  return (
    <header
      ref={headerRef}
      style={{
        opacity:    0,
        marginBottom: 16,
        height:     24,
        overflow:   'hidden',
        display:    'flex',
        alignItems: 'center',
        gap:         8,
        transition: 'opacity 300ms ease',
      }}
    >
      <span ref={timeRef}     style={{ ...base, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
      <Dot />
      <span ref={locationRef} style={base}>venice, california</span>
      {visitor && countryName && (
        <>
          <Dot />
          <span ref={visitorRef} style={base}>
            {'last visit from '}
            <a
              href={`https://en.wikipedia.org/wiki/${visitor.city.replace(/ /g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--colors-gray10)')}
              style={{ transition: 'color 150ms ease', color: 'inherit' }}
            >
              {visitor.city.toLowerCase()}, {countryName.toLowerCase()}
            </a>
          </span>
        </>
      )}
    </header>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      <SEO description="Engineer. Maker. Venice." />

      <div style={{
        position:  'fixed',
        top:       '22vh',
        left:      '50%',
        transform: 'translateX(-50%)',
        width:      560,
        maxWidth:  'calc(100vw - 48px)',
      }}>
          <TimeLocation />
          <p
            style={{
              color:         'var(--colors-gray12)',
              fontSize:       25,
              lineHeight:    '35px',
              letterSpacing: '-0.5px',
              textTransform: 'lowercase',
              fontFamily:    'var(--fonts-body)',
              margin:         0,
            }}
          >
            <span style={{ color: 'var(--colors-gray11)' }}>ben sack.</span>{' '}
            engineer focused on building reliable systems and making complex things easier to run.
            currently at{' '}
            <a href="https://databricks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              databricks
            </a>
            . previously at disney.
          </p>
          <h1 className="vh">Ben Sack — Engineer building reliable systems. Currently at Databricks.</h1>
      </div>
    </>
  )
}
