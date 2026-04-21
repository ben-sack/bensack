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
          top:          24,
          left:         24,
          display:     'flex',
          alignItems:  'center',
          gap:          16,
          pointerEvents: 'auto',
        }}>
          <button
            onClick={() => router.push('/craft')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
            style={base}
          >
            ← craft
          </button>
          <span style={{ ...base, color: 'var(--colors-gray6)', cursor: 'default', pointerEvents: 'none' }}>·</span>
          <span style={{ ...base, cursor: 'default', pointerEvents: 'none' }}>{title.toLowerCase()}</span>
        </div>

        {/* Bottom row — left: hint · right: seed + controls */}
        <div style={{
          position:        'absolute',
          bottom:           24,
          left:             24,
          right:            24,
          display:         'flex',
          justifyContent:  'space-between',
          alignItems:      'center',
          pointerEvents:   'auto',
        }}>
          <span style={{ ...base, cursor: 'default', pointerEvents: 'none' }}>
            space · click to reseed
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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
