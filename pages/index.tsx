import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import SEO from '../components/SEO'
import type { BotEffect, BotScene } from '../components/SignalField'
import { shuffleLetters } from '../lib/utils'
import { ZONES, ZONE_ORDER } from '../lib/zones'

const SignalField = dynamic(() => import('../components/SignalField'), { ssr: false })

const EFFECTS: { id: BotEffect; label: string }[] = [
  { id: 'clouds', label: 'clouds' },
  { id: 'rain',  label: 'rain'  },
  { id: 'stars', label: 'stars' },
]

// World picker is driven by the zone registry — add a zone in lib/zones.ts and it
// shows up here automatically.
const SCENES: { id: BotScene; label: string }[] = ZONE_ORDER.map((id) => ({
  id,
  label: ZONES[id].label,
}))


// ─── Dot ──────────────────────────────────────────────────────────────────────
function Dot() {
  return <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: 'var(--colors-gray8)', flexShrink: 0, alignSelf: 'center' }} />
}

// ─── Time + location ──────────────────────────────────────────────────────────
function TimeLocation() {
  const ipInfoToken = process.env.NEXT_PUBLIC_IPINFO_TOKEN
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

  useEffect(() => {
    if (!ipInfoToken) return
    fetch(`https://ipinfo.io/json?token=${ipInfoToken}`)
      .then((r) => r.json())
      .then((d: { city?: string; country?: string }) => {
        if (d.city && d.country) setVisitor({ city: d.city, country: d.country })
      })
      .catch(() => {})
  }, [ipInfoToken])

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
    fontSize: 12,
    lineHeight: '24px',
    color: 'var(--colors-gray10)',
    fontFamily: 'var(--fonts-body)',
    fontWeight: 500,
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
      <span
        ref={timeRef}
        style={{
          ...base,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.05em',
        }}
      >
        {time}
      </span>
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
  const { resolvedTheme } = useTheme()
  const [effects, setEffects] = useState<BotEffect[]>([])
  const [scene,  setScene]  = useState<BotScene>('nature')
  const [mobile, setMobile]  = useState(false)
  const [effectTouched, setEffectTouched] = useState(false)
  const [buddySpawnRequest, setBuddySpawnRequest] = useState(0)
  const [buddyRemoveRequest, setBuddyRemoveRequest] = useState(0)
  const [playground, setPlayground] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Restore the playground (and the last-visited world) so navigating away and
  // back keeps it open instead of resetting to the dimmed default.
  useEffect(() => {
    try {
      if (localStorage.getItem('sf:playground') === '1') setPlayground(true)
      const saved = localStorage.getItem('sf:scene') as BotScene | null
      if (saved && SCENES.some((s) => s.id === saved)) setScene(saved)
    } catch { /* storage unavailable — fall back to defaults */ }
  }, [])

  // Persist on change. Skips the initial mount so it can't clobber the values the
  // restore effect just read.
  const persistGuard = useRef(true)
  useEffect(() => {
    if (persistGuard.current) { persistGuard.current = false; return }
    try {
      localStorage.setItem('sf:playground', playground ? '1' : '0')
      localStorage.setItem('sf:scene', scene)
    } catch { /* ignore */ }
  }, [scene, playground])

  useEffect(() => {
    if (effectTouched) return
    setEffects(['clouds'])
  }, [resolvedTheme, effectTouched])

  // Keyboard shortcuts (only while the playground is open):
  //   1–5  → jump straight to a zone
  //   [ ]  → cycle zones left / right
  useEffect(() => {
    if (!playground) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const numeric = Number(e.key)
      if (numeric >= 1 && numeric <= SCENES.length) {
        setScene(SCENES[numeric - 1].id)
        return
      }
      if (e.key === ']' || e.key === '[') {
        setScene((current) => {
          const idx = SCENES.findIndex((s) => s.id === current)
          const next = e.key === ']'
            ? (idx + 1) % SCENES.length
            : (idx - 1 + SCENES.length) % SCENES.length
          return SCENES[next].id
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playground])

  return (
    <>
      <SEO description="Engineer. Maker. Venice." />

      <div style={{
        opacity: playground ? 1 : 0.05,
        transition: 'opacity 700ms ease',
      }}>
        <SignalField
          mode="bots"
          effect={effects}
          scene={scene}
          buddySpawnRequest={buddySpawnRequest}
          buddyRemoveRequest={buddyRemoveRequest}
        />
      </div>

      <div style={{
        position:  'fixed',
        top:       '9vh',
        left:      '50%',
        transform: 'translateX(-50%)',
        width:      560,
        maxWidth:  'calc(100vw - 48px)',
        zIndex:    2,
      }}>
          <TimeLocation />
          <p
            style={{
              color:         'var(--colors-gray12)',
              fontSize:       mobile ? 18 : 25,
              lineHeight:     mobile ? '27px' : '35px',
              letterSpacing: '-0.5px',
              textTransform: 'lowercase',
              fontFamily:    'var(--fonts-body)',
              margin:         0,
            }}
          >
            <span style={{ color: 'var(--colors-gray11)' }}>ben sack.</span>{' '}
            data engineer at{' '}
            <a href="https://databricks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              databricks
            </a>
            . also responsible for whatever this is.
          </p>
          <h1 className="vh">Ben Sack — Engineer building reliable systems. Currently at Databricks.</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>

            {/* playground toggle — always visible */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--colors-gray8)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', letterSpacing: '0.02em', width: 32 }}>
                ↳
              </span>
              <button
                onClick={() => setPlayground((p) => !p)}
                style={{
                  fontSize:      11,
                  fontFamily:    'var(--fonts-body)',
                  textTransform: 'lowercase',
                  letterSpacing: '0.02em',
                  color:         playground ? 'var(--colors-gray12)' : 'var(--colors-gray8)',
                  background:    'transparent',
                  border:        0,
                  cursor:        'pointer',
                  padding:       mobile ? '8px 6px' : 0,
                  margin:        mobile ? '-8px -6px' : 0,
                  transition:    'color 150ms ease',
                }}
              >
                playground
              </button>
            </div>

            {/* controls — only accessible in playground mode */}
            <div style={{
              opacity:       playground ? 1 : 0,
              transform:     playground ? 'translateY(0)' : 'translateY(-4px)',
              pointerEvents: playground ? 'auto' : 'none',
              transition:    'opacity 400ms ease, transform 400ms ease',
              display:       'flex',
              flexDirection: 'column',
              gap:           6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--colors-gray8)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', letterSpacing: '0.02em', width: 32 }}>
                  fx
                </span>
                {EFFECTS.map(({ id, label }, i) => (
                  <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i > 0 && <span style={{ color: 'var(--colors-gray6)', fontSize: 11 }}>·</span>}
                    <button
                      onClick={() => {
                        setEffectTouched(true)
                        setEffects((current) =>
                          current.includes(id)
                            ? current.filter((effectId) => effectId !== id)
                            : [...current, id]
                        )
                      }}
                      style={{
                        fontSize:       11,
                        fontFamily:     'var(--fonts-body)',
                        textTransform:  'lowercase',
                        letterSpacing:  '0.02em',
                        color:          effects.includes(id) ? 'var(--colors-gray12)' : 'var(--colors-gray8)',
                        background:     'transparent',
                        border:         0,
                        cursor:         'pointer',
                        padding:        mobile ? '8px 6px' : 0,
                        margin:         mobile ? '-8px -6px' : 0,
                        transition:     'color 150ms ease',
                      }}
                    >
                      {label}
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--colors-gray8)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', letterSpacing: '0.02em', width: 32 }}>
                  world
                </span>
                {SCENES.map(({ id, label }, i) => (
                  <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i > 0 && <span style={{ color: 'var(--colors-gray6)', fontSize: 11 }}>·</span>}
                    <button
                      onClick={() => setScene(id)}
                      style={{
                        fontSize:       11,
                        fontFamily:     'var(--fonts-body)',
                        textTransform:  'lowercase',
                        letterSpacing:  '0.02em',
                        color:          scene === id ? 'var(--colors-gray12)' : 'var(--colors-gray8)',
                        background:     'transparent',
                        border:         0,
                        cursor:         'pointer',
                        padding:        mobile ? '8px 6px' : 0,
                        margin:         mobile ? '-8px -6px' : 0,
                        transition:     'color 150ms ease',
                      }}
                    >
                      {label}
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--colors-gray8)', fontFamily: 'var(--fonts-body)', textTransform: 'lowercase', letterSpacing: '0.02em', width: 32 }}>
                  buddies
                </span>
                <span style={{ width: 10, flexShrink: 0 }} />
                <button
                  onClick={() => setBuddySpawnRequest((current) => current + 1)}
                  style={{
                    fontSize:       11,
                    fontFamily:     'var(--fonts-body)',
                    textTransform:  'lowercase',
                    letterSpacing:  '0.02em',
                    color:          'var(--colors-gray12)',
                    background:     'transparent',
                    border:         0,
                    cursor:         'pointer',
                    padding:        mobile ? '8px 6px' : 0,
                    margin:         mobile ? '-8px -6px' : 0,
                    transition:     'color 150ms ease',
                  }}
                >
                  +
                </button>
                <span style={{ color: 'var(--colors-gray6)', fontSize: 11, marginLeft: -3, marginRight: -3 }}>·</span>
                <button
                  onClick={() => setBuddyRemoveRequest((current) => current + 1)}
                  style={{
                    fontSize:       11,
                    fontFamily:     'var(--fonts-body)',
                    textTransform:  'lowercase',
                    letterSpacing:  '0.02em',
                    color:          'var(--colors-gray12)',
                    background:     'transparent',
                    border:         0,
                    cursor:         'pointer',
                    padding:        mobile ? '8px 6px' : 0,
                    margin:         mobile ? '-8px -6px' : '0 0 0 -8px',
                    transition:     'color 150ms ease',
                  }}
                >
                  -
                </button>
              </div>
            </div>

          </div>
      </div>
    </>
  )
}
