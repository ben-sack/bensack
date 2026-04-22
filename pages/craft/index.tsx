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

function scatterItems<T extends { genArt?: { type: GenArtType } }>(items: T[]) {
  const groups = new Map<GenArtType | 'other', T[]>()

  for (const item of items) {
    const key = item.genArt?.type ?? 'other'
    const bucket = groups.get(key) ?? []
    bucket.push(item)
    groups.set(key, bucket)
  }

  const orderedGroups = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([, bucket]) => [...bucket])

  const scattered: T[] = []

  while (orderedGroups.some((bucket) => bucket.length > 0)) {
    for (const bucket of orderedGroups) {
      const next = bucket.shift()
      if (next) scattered.push(next)
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
      { rootMargin: '200px' }
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
