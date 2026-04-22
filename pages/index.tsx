import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import SEO from '../components/SEO'
import type { BotEffect, BotScene } from '../components/SignalField'
import { shuffleLetters } from '../lib/utils'

const SignalField = dynamic(() => import('../components/SignalField'), { ssr: false })

const EFFECTS: { id: BotEffect; label: string }[] = [
  { id: 'clouds', label: 'clouds' },
  { id: 'rain',  label: 'rain'  },
  { id: 'stars', label: 'stars' },
]

const SCENES: { id: BotScene; label: string }[] = [
  { id: 'nature', label: 'nature' },
  { id: 'city',   label: 'city'   },
]


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
    const fmt = () => new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric', minute: '2-digit', second: '2-digit',
    })
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
  const { resolvedTheme } = useTheme()
  const [effects, setEffects] = useState<BotEffect[]>([])
  const [scene,  setScene]  = useState<BotScene>('nature')
  const [mobile, setMobile]  = useState(false)
  const [effectTouched, setEffectTouched] = useState(false)

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

  useEffect(() => {
    if (effectTouched) return
    setEffects(['clouds'])
  }, [resolvedTheme, effectTouched])

  return (
    <>
      <SEO description="Engineer. Maker. Venice." />

      <SignalField mode="bots" effect={effects} scene={scene} />

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </div>
      </div>
    </>
  )
}
