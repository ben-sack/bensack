import { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Masonry from 'react-masonry-css'
import SEO from '../../components/SEO'
import Box from '../../components/Box'
import Text from '../../components/Text'
import { css } from '../../stitches.config'
import { craftItems } from '../../lib/data'
import type { GenArtType } from '../../lib/data'
import { slugify } from '../../lib/utils'

const GenArt = dynamic(() => import('../../components/GenArt'), { ssr: false })

// ─── Card styles ─────────────────────────────────────────────────────────────
const cardCss = css({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 12,
  border: '1px solid $gray5',
  background: '$gray2',
  cursor: 'pointer',
  display: 'block',
  marginBottom: 8,
  '&:hover [data-overlay]': { opacity: 1 },
  '&:hover video': { filter: 'none' },
  video: {
    display: 'block',
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
  },
})

const overlayGradient = css({
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(to top, hsla(0 0% 0% / 90%), 50%, hsla(0 0% 0% / 0))',
  opacity: 0,
  transition: 'opacity 200ms ease',
  zIndex: 1,
})

interface CardProps {
  title: string
  src?: string
  genArt?: { type: GenArtType; seed: number }
  id: string
  href?: string
}

function compactLabel(title: string, genArt?: CardProps['genArt']) {
  if (genArt) {
    const seed = genArt.seed.toString(16).padStart(6, '0')
    const prefix = {
      'flow-field': 'Flow',
      'charge-field': 'Charge',
      'curl-flow': 'Curl',
      'reaction-diffusion': 'Reaction',
      'truchet': 'Truchet',
      'strange-attractor': 'Attractor',
    } satisfies Record<GenArtType, string>

    return `${prefix[genArt.type]} ${seed}`
  }

  return title
}

function scatterItems<T extends { genArt?: { type: GenArtType; seed?: number } }>(items: T[]) {
  const groups = new Map<GenArtType | 'other', T[]>()

  for (const item of items) {
    const key = item.genArt?.type ?? 'other'
    const bucket = groups.get(key) ?? []
    bucket.push(item)
    groups.set(key, bucket)
  }

  // Deterministic shuffle so the grid feels mixed without changing on every render.
  const hash = (value: string) => {
    let h = 2166136261
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  const orderedGroups = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, bucket]) =>
      [...bucket].sort((a, b) => {
        const aKey = `${key}:${a.genArt?.seed ?? 0}:${'id' in a ? String(a.id) : ''}`
        const bKey = `${key}:${b.genArt?.seed ?? 0}:${'id' in b ? String(b.id) : ''}`
        return hash(aKey) - hash(bKey)
      }),
    )

  const scattered: T[] = []
  let lastType: GenArtType | 'other' | null = null

  while (orderedGroups.some((bucket) => bucket.length > 0)) {
    const nextBucket = [...orderedGroups]
      .filter((bucket) => bucket.length > 0)
      .sort((a, b) => b.length - a.length)
      .find((bucket) => (bucket[0]?.genArt?.type ?? 'other') !== lastType)
      ?? [...orderedGroups]
        .filter((bucket) => bucket.length > 0)
        .sort((a, b) => b.length - a.length)[0]

    const next = nextBucket?.shift()
    if (next) {
      scattered.push(next)
      lastType = next.genArt?.type ?? 'other'
    }
  }

  return scattered
}

function CraftCard({ title, src, genArt, id, href }: CardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const itemRef  = useRef<HTMLAnchorElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = itemRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isGenArt  = !!genArt
  const isExternal = href?.startsWith('https')
  const target     = href !== undefined ? href : `/craft/${id}${isGenArt ? `?seed=${genArt!.seed.toString(16).padStart(6, '0')}` : ''}`
  const label      = compactLabel(title, genArt)

  return (
    <a
      ref={itemRef}
      href={target || undefined}
      className={cardCss()}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onPointerEnter={() => !isGenArt && videoRef.current?.play()}
      onPointerLeave={() => {
        if (!isGenArt && videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
      }}
    >
      {isGenArt ? (
        // Gen art canvas — pauses when scrolled out of view
        <div style={{ aspectRatio: '1 / 1', width: '100%' }} onClick={e => e.preventDefault()}>
          <GenArt
            type={genArt!.type}
            seed={genArt!.seed}
            paused={!inView}
            resolutionScale={0.62}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <video ref={videoRef} playsInline loop muted src={inView && src ? src : undefined} style={{ filter: 'none' }} />
      )}
      <div className={overlayGradient()} data-overlay="" />
      <Box
        data-overlay=""
        css={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: '12px 16px',
          zIndex: 2,
          opacity: 0,
          transition: 'opacity 200ms ease',
          pointerEvents: 'none',
        }}
      >
        <Text
          size="10"
          weight="500"
          css={{
            color: 'rgba(255,255,255,0.9)',
            d: 'block',
            letterSpacing: '0.02em',
            textTransform: 'lowercase',
          }}
        >
          {label}
        </Text>
      </Box>
    </a>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Craft() {
  const items = scatterItems(craftItems)

  return (
    <>
      <SEO title="Craft" description="Interactive components, shaders, and generative art." />
      <Masonry
        breakpointCols={{ default: 3, 960: 2, 480: 1 }}
        className="grid"
        columnClassName="column"
      >
        {items.map((item) => {
          const id = slugify(item.title)
          return (
            <CraftCard
              key={item.title}
              title={item.title}
              src={item.src}
              genArt={item.genArt as CardProps['genArt']}
              id={id}
              href={item.href}
            />
          )
        })}
      </Masonry>
    </>
  )
}
