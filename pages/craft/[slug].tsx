import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import type { GetStaticPaths, GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import SEO from '../../components/SEO'
import { craftItems } from '../../lib/data'
import { slugify } from '../../lib/utils'
import type { GenArtType } from '../../components/GenArt'

const GenArt = dynamic(() => import('../../components/GenArt'), { ssr: false })

interface Props {
  title: string
  canonicalSeed: number
  type: GenArtType
}

export default function CraftDetail({ title, canonicalSeed, type }: Props) {
  const router   = useRouter()
  const canvasEl = useRef<HTMLCanvasElement | null>(null)

  const [seed,    setSeed]    = useState(canonicalSeed)
  const [hud,     setHud]     = useState(true)
  const [mobile,  setMobile]  = useState(false)
  const hudTimer  = useRef<ReturnType<typeof setTimeout>>()

  // Initialise seed from URL query once router is ready
  useEffect(() => {
    if (!router.isReady) return
    const s = router.query.seed
    if (typeof s === 'string') setSeed(parseInt(s, 16))
  }, [router.isReady])

  // Keep URL in sync with seed (shallow — no page reload)
  useEffect(() => {
    if (!router.isReady) return
    router.replace(
      { query: { slug: slugify(title), seed: seed.toString(16).padStart(6, '0') } },
      undefined,
      { shallow: true },
    )
  }, [seed, router.isReady])

  const reseed = useCallback(() => setSeed(Math.floor(Math.random() * 0xFFFFFF)), [])

  // Spacebar to reseed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault()
        reseed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reseed])

  // Auto-hide HUD after 3s of no mouse movement; show on move
  useEffect(() => {
    const show = () => {
      setHud(true)
      clearTimeout(hudTimer.current)
      hudTimer.current = setTimeout(() => setHud(false), 3000)
    }
    show()
    window.addEventListener('mousemove', show)
    return () => {
      window.removeEventListener('mousemove', show)
      clearTimeout(hudTimer.current)
    }
  }, [])

  useEffect(() => {
    const sync = () => setMobile(window.innerWidth < 720)
    sync()
    window.addEventListener('resize', sync, { passive: true })
    return () => window.removeEventListener('resize', sync)
  }, [])

  const downloadPng = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${slugify(title)}-${seed.toString(16).padStart(6, '0')}.png`
    a.click()
  }, [title, seed])

  const base: React.CSSProperties = {
    fontFamily:    'var(--fonts-mono)',
    fontSize:       11,
    letterSpacing: '0.05em',
    color:         'var(--colors-gray9)',
    background:    'transparent',
    border:         0,
    padding:        0,
    cursor:        'pointer',
    textTransform: 'lowercase',
    transition:    'color 150ms ease',
  }

  return (
    <>
      <SEO title={title} description={`${title} — generative art by Ben Sack`} />

      {/* Full-bleed canvas — sits behind HUD */}
      <GenArt
        type={type}
        seed={seed}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0 }}
      />

      {/* HUD overlay */}
      <div
        style={{
          position:   'fixed',
          inset:       0,
          zIndex:      10,
          pointerEvents: 'none',
          opacity:     hud ? 1 : 0,
          transition: 'opacity 600ms ease',
        }}
      >
        {/* Top-left — back + title */}
        <div style={{
          position:    'absolute',
          top:          mobile ? 18 : 24,
          left:         mobile ? 18 : 24,
          display:     'flex',
          alignItems:  'center',
          gap:          mobile ? 10 : 16,
          pointerEvents: 'auto',
          maxWidth:     mobile ? 'calc(100vw - 156px)' : 'none',
        }}>
          <button
            onClick={() => router.push('/craft')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
            style={base}
          >
            ← craft
          </button>
          {!mobile && <span style={{ ...base, color: 'var(--colors-gray6)', cursor: 'default', pointerEvents: 'none' }}>·</span>}
          <span
            style={{
              ...base,
              cursor: 'default',
              pointerEvents: 'none',
              maxWidth: mobile ? '100%' : 'none',
              overflow: mobile ? 'hidden' : 'visible',
              textOverflow: mobile ? 'ellipsis' : 'clip',
              whiteSpace: 'nowrap',
            }}
          >
            {title.toLowerCase()}
          </span>
        </div>

        {/* Controls */}
        <div style={{
          position:        'absolute',
          top:             mobile ? 18 : 24,
          right:           mobile ? 18 : 24,
          display:         'flex',
          flexDirection:   mobile ? 'column' : 'row',
          alignItems:      'center',
          justifyContent:  'flex-end',
          gap:             mobile ? 8 : 20,
          pointerEvents:   'auto',
        }}>
          <span style={{ ...base, cursor: 'default', pointerEvents: 'none', color: 'var(--colors-gray7)' }}>
            {seed.toString(16).padStart(6, '0')}
          </span>
          <button
            onClick={reseed}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
            style={base}
          >
            reseed
          </button>
          <button
            onClick={downloadPng}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
            style={base}
          >
            save png
          </button>
        </div>

        {/* Hint */}
        <div style={{
          position:      'absolute',
          bottom:        mobile ? 18 : 24,
          left:          mobile ? 18 : 24,
          right:         mobile ? 18 : 'auto',
          pointerEvents: 'none',
        }}>
          <span style={{ ...base, cursor: 'default', color: 'var(--colors-gray7)' }}>
            {mobile ? 'tap artwork to reseed' : 'space · click to reseed'}
          </span>
        </div>
      </div>
    </>
  )
}

// ── Static generation ────────────────────────────────────────────────────────
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: craftItems
    .filter(i => i.genArt)
    .map(i => ({ params: { slug: slugify(i.title) } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const item = craftItems.find(i => slugify(i.title) === params?.slug)
  if (!item?.genArt) return { notFound: true }
  return {
    props: {
      title:         item.title,
      canonicalSeed: item.genArt.seed,
      type:          item.genArt.type,
    },
  }
}
