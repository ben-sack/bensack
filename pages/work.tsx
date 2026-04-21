import { useEffect, useRef, useState } from 'react'
import { motion, animate, useMotionValue, useInView, AnimatePresence } from 'framer-motion'
import type { GetStaticProps } from 'next'
import SEO from '../components/SEO'
import Box from '../components/Box'
import Text from '../components/Text'
import { styled } from '../stitches.config'
import { resume } from '../lib/data'
import { shuffleLetters } from '../lib/utils'

// ─── Styles ────────────────────────────────────────────────────────────────
const SectionLabel = styled('p', {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '$gray9',
  fontFamily: '$body',
  mb: '$1',
  mt: '$4',
})

const Divider = styled('hr', {
  border: 0,
  height: 1,
  background: '$gray4',
  my: '$2',
})

// ─── Reveal line ───────────────────────────────────────────────────────────
// Single-line text that fades + slides in and scrambles into place.
// For linked items shuffleLetters targets the <a> directly so the DOM node
// is never flattened (applying it to a parent with child elements destroys them).
function RevealLine({ label, href, delay = 0 }: { label: string; href?: string; delay?: number }) {
  const ref    = useRef<HTMLElement>(null)
  const isInView = useInView(ref as React.RefObject<HTMLElement>, { once: true })
  const fired  = useRef(false)

  useEffect(() => {
    if (!isInView || fired.current) return
    fired.current = true
    const t = setTimeout(() => {
      if (ref.current) shuffleLetters(ref.current, { iterations: 5 })
    }, delay * 1000 + 40)
    return () => clearTimeout(t)
  }, [isInView, delay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
    >
      <Text size="13" color="gray11" css={{ lineHeight: '20px' }}>
        {href ? (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href} target="_blank" rel="noopener noreferrer"
            style={{ color: 'inherit', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '')}
          >{label}</a>
        ) : (
          <span ref={ref as React.Ref<HTMLSpanElement>}>{label}</span>
        )}
      </Text>
    </motion.div>
  )
}

// ─── Animated section label ────────────────────────────────────────────────
// Shuffles text into place when it enters the viewport.
function AnimatedLabel({ children, delay = 0, 'data-platform': dataPlatform }: {
  children: React.ReactNode
  delay?: number
  'data-platform'?: string
}) {
  const ref      = useRef<HTMLParagraphElement>(null)
  const isInView = useInView(ref, { once: true })
  const fired    = useRef(false)

  useEffect(() => {
    if (!isInView || fired.current) return
    fired.current = true
    const t = setTimeout(() => {
      if (ref.current) shuffleLetters(ref.current, { iterations: 10 })
    }, delay * 1000)
    return () => clearTimeout(t)
  }, [isInView, delay])

  return (
    <motion.div
      data-platform={dataPlatform}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.15, delay }}
    >
      <SectionLabel ref={ref as React.Ref<HTMLParagraphElement>}>{children}</SectionLabel>
    </motion.div>
  )
}

// ─── Work entry ────────────────────────────────────────────────────────────
interface WorkEntryProps {
  company: string
  title: string
  start: string
  end: string
  delay?: number
}

function WorkEntry({ company, title, start, end, delay = 0 }: WorkEntryProps) {
  const companyRef = useRef<HTMLSpanElement>(null)
  const titleRef   = useRef<HTMLSpanElement>(null)
  const dateRef    = useRef<HTMLSpanElement>(null)

  // Fire shuffle timed with the staggered reveal so text scrambles as it appears
  useEffect(() => {
    const opts = { iterations: 6 }
    const t1 = setTimeout(() => {
      if (companyRef.current) shuffleLetters(companyRef.current, opts)
      if (titleRef.current)   shuffleLetters(titleRef.current,   opts)
    }, delay * 1000 + 40)
    const t2 = setTimeout(() => {
      if (dateRef.current) shuffleLetters(dateRef.current, opts)
    }, delay * 1000 + 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
    >
      <Box css={{ display: 'flex', ai: 'baseline', gap: 8 }}>
        <span ref={companyRef} style={{ fontSize: 14, fontWeight: 500, color: 'var(--colors-gray12)', fontFamily: 'var(--fonts-body)', flexShrink: 0 }}>{company}</span>
        <span ref={titleRef} style={{ fontSize: 13, color: 'var(--colors-gray11)', fontFamily: 'var(--fonts-body)', flexShrink: 0 }}>{title}</span>
        <motion.span
          data-platform="work"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: delay + 0.35 }}
          style={{ flex: 1, display: 'block', borderBottom: '1px solid var(--colors-gray5)', marginBottom: 3, transformOrigin: 'left' }}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, delay: delay + 0.5 }}
          style={{ flexShrink: 0 }}
        >
          <span ref={dateRef} style={{ fontSize: 13, color: 'var(--colors-gray9)', fontFamily: 'var(--fonts-body)', whiteSpace: 'nowrap' }}>{start} – {end}</span>
        </motion.span>
      </Box>
    </motion.div>
  )
}

// ─── Mushroom walker ──────────────────────────────────────────────────────
const MUSH_FRAMES = [
  ['            ', ' .-o-OO-o-. ', '(__________)', '   | · ·|   ', '   |____|   '],
  ['            ', ' .-O-oo-O-. ', '(__________)', '   | · ·|   ', '   |____|   '],
  ['   . o  .   ', ' .-o-OO-o-. ', '(__________)', '   | · ·|   ', '   |____|   '],
]
const MUSH_NEUTRAL   = ['            ', ' .-o-OO-o-. ', '(__________)', '   | · ·|   ', '   |____|   ']
const MUSH_LOOK_LEFT = ['            ', ' .-o-OO-o-. ', '(__________)', '   |· · |   ', '   |____|   ']
const MUSH_ARM_REACH = ['            ', ' .-o-OO-o-. ', '(__________)', ' o=|· · |   ', '   |____|   ']
const MUSH_ARM_PULL  = ['            ', ' .-o-OO-o-. ', '(__________)', '  /|· · |   ', '   |____|   ']
const MUSH_LOOK_UP   = ['    * *     ', ' .-o-OO-o-. ', '(__________)', '   | ^ ^|   ', '   |____|   ']
const DUST_CHARS = ['·', '.', "'"]

type Particle = { x: number; y: number; vx: number; vy: number; life: number; ch: string }

function MushWalker({ wrapRef, onComplete }: { wrapRef: React.RefObject<HTMLDivElement>; onComplete: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const isInView     = useInView(wrapRef, { once: true, amount: 0 })

  const xMotion      = useMotionValue(-100)
  const topMotion    = useMotionValue(0)
  const rotateMotion = useMotionValue(0)
  const leverOpacity = useMotionValue(0)
  const leverY       = useMotionValue(0)
  const leverX       = useMotionValue(0)
  const mushX   = useRef(-100)
  const mushTop = useRef(0)
  const particles = useRef<Particle[]>([])
  const isWalking = useRef(false)
  const spawnT    = useRef(0)
  const rafId     = useRef<number>()
  const lastT     = useRef(0)

  const [display,       setDisplay]       = useState(MUSH_NEUTRAL)
  const [done,          setDone]          = useState(false)
  const [btnPressed,    setBtnPressed]    = useState(false)

  useEffect(() => xMotion.on('change',   v => { mushX.current   = v }), [xMotion])
  useEffect(() => topMotion.on('change', v => { mushTop.current = v }), [topMotion])

  // Canvas particle loop
  useEffect(() => {
    const container = wrapRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const BH = 5 * 13  // sprite height

    const resize = () => {
      canvas.width  = container.offsetWidth
      canvas.height = container.scrollHeight || container.offsetHeight
      ctx.font = '10px Menlo, monospace'
      ctx.textBaseline = 'bottom'
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    function tick(now: number) {
      rafId.current = requestAnimationFrame(tick)
      const dt = Math.min((now - (lastT.current || now)) / 1000, 0.05)
      lastT.current = now
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.font = '10px Menlo, monospace'

      if (isWalking.current) {
        spawnT.current += dt
        if (spawnT.current > 0.10) {
          spawnT.current = 0
          const footX = mushX.current + 36
          const footY = mushTop.current + BH
          for (let p = 0; p < 4; p++) {
            const side = p < 2 ? -1 : 1
            particles.current.push({
              x:    footX + (Math.random() - 0.5) * 20,
              y:    footY,
              vx:   side * (20 + Math.random() * 50),
              vy:   -(10 + Math.random() * 30),
              life: 1.0,
              ch:   DUST_CHARS[Math.floor(Math.random() * DUST_CHARS.length)],
            })
          }
        }
      }

      const dark = document.documentElement.classList.contains('dark')
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i]
        p.x    += p.vx * dt
        p.y    += p.vy * dt
        p.vy   += 180 * dt
        p.life -= dt * 2.8
        if (p.life <= 0) { particles.current.splice(i, 1); continue }
        const pa = (dark ? 0.55 : 0.45) * p.life
        ctx!.fillStyle = dark ? `rgba(255,255,255,${pa})` : `rgba(30,30,30,${pa})`
        ctx!.fillText(p.ch, p.x, p.y)
      }
    }

    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      ro.disconnect()
    }
  }, [wrapRef])

  // Walk sequence — mushroom walks along the top borders of the first two project cards
  useEffect(() => {
    if (!isInView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(true)
      return
    }

    const container = wrapRef.current
    if (!container) return
    const w          = container.offsetWidth
    const WALK_SPEED = 105  // px/s
    const BH         = 5 * 13
    const sleep      = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    let cancelled    = false
    let walkIdx      = 0
    let walkTimer: ReturnType<typeof setInterval>

    const startWalk = () => {
      isWalking.current = true
      walkTimer = setInterval(() => {
        if (cancelled) return
        walkIdx = (walkIdx + 1) % 3
        setDisplay(MUSH_FRAMES[walkIdx])
      }, 180)
    }
    const stopWalk = () => {
      isWalking.current = false
      clearInterval(walkTimer)
    }

    const measureCards = () => {
      const cr = container.getBoundingClientRect()
      return Array.from(container.querySelectorAll<HTMLElement>('[data-mush-plat]'))
        .slice(0, 2)
        .map(el => {
          const r = el.getBoundingClientRect()
          return { left: r.left - cr.left, right: r.right - cr.left, top: r.top - cr.top, width: r.width }
        })
    }

    const sparkBurst = () => {
      const sx = mushX.current + 10
      const sy = mushTop.current + 3 * 13 + 6
      for (let p = 0; p < 5; p++) {
        particles.current.push({
          x: sx + (Math.random() - 0.5) * 20,
          y: sy + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 90,
          vy: -25 - Math.random() * 35,
          life: 0.7,
          ch: ['*', '+', '·', '×'][Math.floor(Math.random() * 4)],
        })
      }
    }

    async function run() {
      // Let card entrance animations finish, then an extra pause before walking in
      await sleep(1600)
      if (cancelled) return

      const cards  = measureCards()
      const platTop = cards.length >= 2 ? cards[0].top : 40
      const card1   = cards[0] ?? { left: 0,         right: w * 0.47, top: platTop, width: w * 0.47 }
      const card2   = cards[1] ?? { left: w * 0.53,  right: w,        top: platTop, width: w * 0.47 }

      // On mobile the grid is single-column so card2 is stacked below card1
      const isMobile = cards.length >= 2 && card2.top > card1.top + 20

      // Snap to card-border height before appearing
      topMotion.set(platTop - BH - 10)

      startWalk()
      if (isMobile) {
        // Mobile: walk to 45% of the full-width card, pause, walk off
        const pauseX = card1.left + card1.width * 0.45
        await animate(xMotion, pauseX, {
          duration: (pauseX + 100) / WALK_SPEED,
          ease: 'linear',
        })
      } else {
        // Desktop: walk to end of card 1, hop gap, walk to 40% of card 2
        await animate(xMotion, card1.right - 42, {
          duration: (card1.right - 42 + 100) / WALK_SPEED,
          ease: 'linear',
        })
        if (cancelled) return

        stopWalk()
        await Promise.all([
          animate(xMotion, card2.left - 4, { duration: 0.52, ease: 'linear' }),
          (async () => {
            await animate(topMotion, platTop - BH - 36, { duration: 0.18, ease: 'easeOut' })
            await animate(topMotion, platTop - BH - 10, { duration: 0.18, ease: 'easeIn'  })
          })(),
        ])
        if (cancelled) return

        startWalk()
        const pauseX = card2.left + card2.width * 0.4
        await animate(xMotion, pauseX, {
          duration: (pauseX - card2.left) / WALK_SPEED,
          ease: 'linear',
        })
      }
      if (cancelled) return

      stopWalk()
      setDisplay(MUSH_NEUTRAL)
      await sleep(250)
      if (cancelled) return
      setDisplay(MUSH_LOOK_LEFT)
      await sleep(700)
      if (cancelled) return
      setDisplay(MUSH_NEUTRAL)
      await sleep(250)
      if (cancelled) return

      startWalk()
      await animate(xMotion, w + 100, {
        duration: (w + 100 - xMotion.get()) / WALK_SPEED,
        ease: 'linear',
      })
      stopWalk()
      if (cancelled) return

      // Peek back from right edge — lean in, pull lever, watch buddies fall, retreat
      // Show more of the mushroom on narrow mobile screens
      const peekX = isMobile ? w * 0.72 : w * 0.91
      await sleep(500)
      if (cancelled) return
      setDisplay(MUSH_LOOK_LEFT)
      await Promise.all([
        animate(xMotion,      peekX, { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }),
        animate(rotateMotion, -28,   { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }),
      ])
      if (cancelled) return

      // Button appears — mounted just left of where the arm reaches
      setBtnPressed(false)
      leverX.set(peekX - 10)
      leverY.set(mushTop.current + 3 * 13)
      leverOpacity.set(0)
      await sleep(200)
      if (cancelled) return
      animate(leverOpacity, 1, { duration: 0.3, ease: 'easeOut' })
      await sleep(400)
      if (cancelled) return

      setDisplay(MUSH_ARM_REACH)
      await sleep(500)
      if (cancelled) return

      // Smash — button squishes flat, sparks fly, buddies drop
      setDisplay(MUSH_ARM_PULL)
      setBtnPressed(true)
      sparkBurst()
      onComplete()
      await Promise.all([
        animate(leverY,       mushTop.current + 3 * 13 + 5, { duration: 0.07, ease: 'easeIn' }),
        animate(leverOpacity, 0,                             { duration: 0.4,  ease: 'easeOut', delay: 0.2 }),
      ])
      if (cancelled) return

      await sleep(150)
      if (cancelled) return
      setDisplay(MUSH_LOOK_UP)
      await sleep(900)
      if (cancelled) return

      // Snap lean upright before bolting — animating rotation from -28→0 while
      // easeIn position barely moves causes the left edge to drift left first.
      rotateMotion.set(0)
      startWalk()
      await animate(xMotion, w + 100, { duration: 0.45, ease: [0.4, 0, 1, 1] })
      stopWalk()
      if (!cancelled) { sessionAnimPlayed = true; setDone(true) }
    }

    run()
    return () => { cancelled = true; stopWalk() }
  }, [isInView, xMotion, topMotion, rotateMotion, wrapRef])

  if (done) return null

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }} />
      <motion.div
        style={{
          x: leverX,
          y: leverY,
          opacity: leverOpacity,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
        }}
      >
        <pre style={{
          fontSize: 10,
          lineHeight: '13px',
          fontFamily: 'var(--fonts-mono)',
          color: 'var(--colors-gray10)',
          margin: 0,
          letterSpacing: 0,
        }}>{btnPressed ? '(-)\n │ ' : '(O)\n │ '}</pre>
      </motion.div>
      <motion.div
        style={{
          x: xMotion,
          y: topMotion,
          rotate: rotateMotion,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
        }}
      >
        <pre style={{
          fontSize: 10,
          lineHeight: '13px',
          fontFamily: 'var(--fonts-mono)',
          color: 'var(--colors-gray10)',
          margin: 0,
          letterSpacing: 0,
        }}>
          {display.join('\n')}
        </pre>
      </motion.div>
    </>
  )
}

// ─── Line buddies ─────────────────────────────────────────────────────────
// ASCII creatures that walk on the divider lines, jump between them, and
// spawn landing dust on arrival — physics identical to SignalField.

function mirrorLine(line: string): string {
  return line.split('').reverse().map(c => {
    switch (c) {
      case '(': return ')'
      case ')': return '('
      case '[': return ']'
      case ']': return '['
      case '{': return '}'
      case '}': return '{'
      case '<': return '>'
      case '>': return '<'
      case '/': return '\\'
      case '\\': return '/'
      default:   return c
    }
  }).join('')
}

const LB_EYES = ['·', '◉', '×', '°', '@', '✦']

// prettier-ignore
const LB_BODIES: Record<string, string[][]> = {
  duck:     [['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--´    '],['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--´~   '],['            ','    __      ','  <(·)___   ','   (  .__>  ','    `--´    ']],
  goose:    [['            ','     (·>    ','     ||     ','   _(__)_   ','    ^^^^    '],['            ','    (·>     ','     ||     ','   _(__)_   ','    ^^^^    '],['            ','     (·>>   ','     ||     ','   _(__)_   ','    ^^^^    ']],
  blob:     [['            ','   .----.   ','  ( ·  · )  ','  (      )  ','   `----´   '],['            ','  .------.  ',' (  ·  ·  ) ',' (        ) ','  `------´  '],['            ','    .--.    ','   (·  ·)   ','   (    )   ','    `--´    ']],
  cat:      [['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  ω  )   ','  (")_(")   '],['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  ω  )   ','  (")_(")~  '],['            ','   /\\-/\\    ','  ( ·   ·)  ','  (  ω  )   ','  (")_(")   ']],
  dragon:   [['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-´  '],['            ','  /^\\  /^\\  ',' <  ·  ·  > ',' (        ) ','  `-vvvv-´  '],['   ~    ~   ','  /^\\  /^\\  ',' <  ·  ·  > ',' (   ~~   ) ','  `-vvvv-´  ']],
  octopus:  [['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  '],['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  \\/\\/\\/\\/  '],['     o      ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  ']],
  owl:      [['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   `----´   '],['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   .----.   '],['            ','   /\\  /\\   ','  ((·)(-))  ','  (  ><  )  ','   `----´   ']],
  penguin:  [['            ','  .---.     ','  (·>·)     ',' /(   )\\    ','  `---´     '],['            ','  .---.     ','  (·>·)     ',' |(   )|    ','  `---´     '],['  .---.     ','  (·>·)     ',' /(   )\\    ','  `---´     ','   ~ ~      ']],
  turtle:   [['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','  ``    ``  '],['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','   ``  ``   '],['            ','   _,--._   ','  ( ·  · )  ',' /[======]\\ ','  ``    ``  ']],
  snail:    [['            ',' ·    .--.  ','  \\  ( @ )  ','   \\_`--´   ','  ~~~~~~~   '],['            ','  ·   .--.  ','  |  ( @ )  ','   \\_`--´   ','  ~~~~~~~   '],['            ',' ·    .--.  ','  \\  ( @  ) ','   \\_`--´   ','   ~~~~~~   ']],
  ghost:    [['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~`~``~`~  '],['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  `~`~~`~`  '],['    ~  ~    ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~~`~~`~~  ']],
  axolotl:  [['            ','}~(______)~{','}~(· .. ·)~{','  ( .--. )  ','  (_/  \\_)  '],['            ','~}(______){~','~}(· .. ·){~','  ( .--. )  ','  (_/  \\_)  '],['            ','}~(______)~{','}~(· .. ·)~{','  (  --  )  ','  ~_/  \\_~  ']],
  capybara: [['            ','  n______n  ',' ( ·    · ) ',' (   oo   ) ','  `------´  '],['            ','  n______n  ',' ( ·    · ) ',' (   Oo   ) ','  `------´  '],['    ~  ~    ','  u______n  ',' ( ·    · ) ',' (   oo   ) ','  `------´  ']],
  cactus:   [['            ',' n  ____  n ',' | |·  ·| | ',' |_|    |_| ','   |    |   '],['            ','    ____    ',' n |·  ·| n ',' |_|    |_| ','   |    |   '],[' n        n ',' |  ____  | ',' | |·  ·| | ',' |_|    |_| ','   |    |   ']],
  robot:    [['            ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------´  '],['            ','   .[||].   ','  [ ·  · ]  ','  [ -==- ]  ','  `------´  '],['     *      ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------´  ']],
  rabbit:   [['            ','   (\\__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],['            ','   (|__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],['            ','   (\\__/)   ','  ( ·  · )  ',' =( .  . )= ','  (")__(")  ']],
  mushroom: [['            ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   '],['            ',' .-O-oo-O-. ','(__________)','   |·  ·|   ','   |____|   '],['   . o  .   ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   ']],
  chonk:    [['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------´  '],['            ','  /\\    /|  ',' ( ·    · ) ',' (   ..   ) ','  `------´  '],['            ','  /\\    /\\  ',' ( ·    · ) ',' (   ..   ) ','  `------´~ ']],
}

interface LBPart { x: number; y: number; vx: number; vy: number; life: number; ch: string; noGravity?: boolean }
interface LBPlat { x: number; y: number; w: number }
interface LBud {
  species:   string
  eye:       string
  x:         number
  y:         number
  vx:        number
  vy:        number
  facing:    1 | -1
  onGround:  boolean
  state:     'walk' | 'airborne' | 'pause' | 'sleep'
  timer:     number
  jumpCool:  number
  animFrame: number
  animTimer: number
  parts:     LBPart[]
}

function LineBuddies({ containerRef, triggered }: { containerRef: React.RefObject<HTMLDivElement>; triggered: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spawnRef  = useRef(false)

  useEffect(() => { if (triggered) spawnRef.current = true }, [triggered])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = '10px Menlo, "Courier New", monospace'
    const CELL_W = ctx.measureText('m').width
    const CELL_H = 13
    const BW     = 12 * CELL_W
    const BH     = 5  * CELL_H

    const GRAVITY = 700
    const JUMP_VY = -420
    const WALK_VX = 52
    const MAX_FALL = 500
    const REPEL_R  = 100
    const DUST_CH  = ['·', '.', "'"]

    const resize = () => {
      canvas.width  = container.offsetWidth
      canvas.height = container.scrollHeight || container.offsetHeight
      ctx.font = '10px Menlo, "Courier New", monospace'
      ctx.textBaseline = 'top'
    }
    resize()

    // Use getBoundingClientRect so nested flex / grid positions are exact.
    // hr  → platform y = top of the line
    // [data-platform] → platform y = bottom edge (buddy stands below the row)
    const getPlats = (): LBPlat[] => {
      const cr = container.getBoundingClientRect()
      return Array.from(container.querySelectorAll<HTMLElement>('hr, [data-platform]'))
        .flatMap(el => {
          const r = el.getBoundingClientRect()
          const x = r.left  - cr.left
          const w = r.width
          if (w < 40) return []  // skip zero-width (mid-animation)
          if (el.tagName === 'HR') return [{ x, y: r.top    - cr.top, w }]
          return                          [{ x, y: r.bottom - cr.top, w }]
        })
    }
    let plats = getPlats()

    let buds: LBud[] = []

    const landDust = (b: LBud, platY: number) => {
      for (let p = 0; p < 5; p++) {
        const side = p < 3 ? -1 : 1
        b.parts.push({
          x: b.x + BW / 2 + (Math.random() - 0.5) * BW * 0.5,
          y: platY - 2,
          vx: side * (20 + Math.random() * 50),
          vy: -(10 + Math.random() * 30),
          life: 1.0,
          ch: DUST_CH[Math.floor(Math.random() * DUST_CH.length)],
        })
      }
    }

    // ── Mouse + drag ──────────────────────────────────────────────────────────
    const mouse = { x: -999, y: -999 }
    let dragIdx = -1, dragOffX = 0, dragOffY = 0

    const getPos = (e: MouseEvent) => {
      const r = container.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const onMove = (e: MouseEvent) => {
      const { x, y } = getPos(e)
      mouse.x = x; mouse.y = y
      if (dragIdx >= 0) {
        const b = buds[dragIdx]
        b.x = x - dragOffX; b.y = y - dragOffY
        b.vx = 0; b.vy = 0; b.onGround = false; b.state = 'airborne'
      }
      const over = buds.some(b => x >= b.x && x <= b.x + BW && y >= b.y && y <= b.y + BH)
      container.style.cursor = dragIdx >= 0 ? 'grabbing' : over ? 'grab' : ''
    }

    const onDown = (e: MouseEvent) => {
      const { x, y } = getPos(e)
      for (let i = 0; i < buds.length; i++) {
        const b = buds[i]
        if (x >= b.x && x <= b.x + BW && y >= b.y && y <= b.y + BH) {
          dragIdx = i; dragOffX = x - b.x; dragOffY = y - b.y
          b.state = 'airborne'; b.onGround = false
          e.preventDefault(); break
        }
      }
    }

    const onUp = () => {
      if (dragIdx >= 0) {
        const b = buds[dragIdx]
        b.vx = (Math.random() - 0.5) * 60; b.vy = 0
      }
      dragIdx = -1; container.style.cursor = ''
    }

    container.addEventListener('mousemove', onMove)
    container.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    const mo = new MutationObserver(() => { plats = getPlats(); resize() })
    mo.observe(container, { childList: true, subtree: true })
    const ro = new ResizeObserver(() => { plats = getPlats(); resize() })
    ro.observe(container)

    let lastT = 0, platTimer = 0, rafId: number

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)

      // Spawn two buddies falling from sky when mushroom finishes
      if (spawnRef.current && buds.length === 0) {
        spawnRef.current = false
        plats = getPlats()
        const allSpecies = Object.keys(LB_BODIES)
        const picked = [...allSpecies].sort(() => Math.random() - 0.5).slice(0, 2)
        buds = picked.map((sp, i) => ({
          species:   sp,
          eye:       LB_EYES[Math.floor(Math.random() * LB_EYES.length)],
          x:         BW + Math.random() * Math.max(0, canvas.width - BW * 3),
          y:         -BH - i * 90,
          vx:        (Math.random() - 0.5) * 20,
          vy:        180 + Math.random() * 80,
          facing:    (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          onGround:  false,
          state:     'airborne' as const,
          timer:     0,
          jumpCool:  1,
          animFrame: 0,
          animTimer: 0.3,
          parts:     [],
        }))
      }

      if (buds.length === 0) return

      const dt = Math.min((now - (lastT || now)) / 1000, 0.05)
      lastT = now

      // Re-measure platforms periodically — catches CSS transform animations completing
      platTimer -= dt
      if (platTimer <= 0) { platTimer = 4; plats = getPlats() }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = '10px Menlo, "Courier New", monospace'
      ctx.textBaseline = 'top'
      const dark = document.documentElement.classList.contains('dark')

      const drawBuddy = (b: LBud) => {
        const frames = LB_BODIES[b.species]
        if (!frames) return
        const frame = frames[b.animFrame % frames.length]
        ctx.fillStyle = dark ? `rgba(255,255,255,0.5)` : `rgba(40,40,40,0.42)`
        ctx.font = '10px Menlo, "Courier New", monospace'
        for (let li = 0; li < frame.length; li++) {
          let line = frame[li].replace(/·/g, b.eye)
          if (b.facing === -1) line = mirrorLine(line)
          ctx.fillText(line, b.x, b.y + li * CELL_H)
        }
        // Species label on hover
        const d = Math.hypot(mouse.x - (b.x + BW / 2), mouse.y - (b.y + BH / 2))
        if (d < 90) {
          const la = (dark ? 0.65 : 0.5) * (1 - d / 90)
          ctx.fillStyle = dark ? `rgba(255,255,255,${la})` : `rgba(40,40,40,${la})`
          ctx.font = '9px Menlo, "Courier New", monospace'
          ctx.textAlign = 'center'
          ctx.fillText(b.species, b.x + BW / 2, b.y - CELL_H * 1.1)
          ctx.textAlign = 'left'
        }
      }

      for (let bi = 0; bi < buds.length; bi++) {
        const b = buds[bi]

        // Dragged — skip physics
        if (bi === dragIdx) {
          b.animTimer -= dt
          if (b.animTimer <= 0) { b.animFrame = (b.animFrame + 1) % 3; b.animTimer = 0.25 }
          drawBuddy(b); continue
        }

        b.animTimer -= dt
        if (b.animTimer <= 0) { b.animFrame = (b.animFrame + 1) % 3; b.animTimer = 0.30 + Math.random() * 0.25 }
        b.timer -= dt; b.jumpCool -= dt

        // Mouse repel — exact SignalField
        const cx = b.x + BW / 2, cy = b.y + BH / 2
        const mdx = cx - mouse.x, mdy = cy - mouse.y
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < REPEL_R * REPEL_R && md2 > 1) {
          const md = Math.sqrt(md2)
          b.vx += (mdx / md) * (1 - md / REPEL_R) * 320 * dt
          b.vy -= (1 - md / REPEL_R) * 80 * dt
        }

        // State machine
        if (b.state === 'walk') {
          b.vx = b.facing * WALK_VX
          if (b.timer <= 0) {
            const roll = Math.random()
            if (roll < 0.12 && b.onGround) {
              b.state = 'sleep'; b.timer = 4 + Math.random() * 6
            } else if (roll < 0.35 && b.jumpCool <= 0 && b.onGround) {
              const feetY = b.y + BH
              const above = plats
                .filter(p => p.y < feetY - 20 && b.x + BW / 2 > p.x && b.x + BW / 2 < p.x + p.w)
                .sort((a, z) => z.y - a.y)[0]
              b.vy       = above ? -Math.sqrt(2 * GRAVITY * (feetY - above.y + 40)) : JUMP_VY
              b.vx       = b.facing * WALK_VX * 1.6
              b.state    = 'airborne'; b.jumpCool = 2.5
            } else if (roll < 0.60) {
              b.facing = b.facing === 1 ? -1 : 1; b.timer = 1.5 + Math.random() * 2.5
            } else {
              b.timer = 1 + Math.random() * 2
            }
          }
        } else if (b.state === 'pause') {
          b.vx = 0; if (b.timer <= 0) b.state = 'walk'
        } else if (b.state === 'sleep') {
          b.vx = 0
          if (Math.random() < dt * 1.2) {
            b.parts.push({
              x: b.x + BW * 0.62 + Math.random() * 8,
              y: b.y + BH * 0.15,
              vx: 8 + Math.random() * 10,
              vy: -(14 + Math.random() * 12),
              life: 1.8,
              ch: Math.random() < 0.5 ? 'z' : 'Z',
              noGravity: true,
            })
          }
          if (b.timer <= 0) { b.state = 'walk'; b.timer = 1 + Math.random() * 2 }
        }

        if (!b.onGround) b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL)
        b.x += b.vx * dt; b.y += b.vy * dt

        if (b.x < 0)                 { b.x = 0;                  b.vx =  Math.abs(b.vx) * 0.6; b.facing =  1 }
        if (b.x + BW > canvas.width) { b.x = canvas.width - BW;  b.vx = -Math.abs(b.vx) * 0.6; b.facing = -1 }
        if (b.y < 0)                 { b.y = 0; b.vy = Math.abs(b.vy) * 0.4 }

        // Platform collision — exact SignalField
        b.onGround = false
        const bCenter = b.x + BW / 2
        for (const plat of plats) {
          const bBottom = b.y + BH
          if (bCenter > plat.x && bCenter < plat.x + plat.w) {
            if (bBottom >= plat.y && bBottom <= plat.y + Math.abs(b.vy) * dt + CELL_H && b.vy >= 0) {
              b.y = plat.y - BH; b.vy = b.vy > 120 ? -b.vy * 0.22 : 0; b.onGround = true
              if (b.state === 'airborne') {
                b.state = 'pause'; b.timer = 0.4 + Math.random() * 0.5; landDust(b, plat.y)
              }
              break
            }
          }
        }
        if (!b.onGround && b.state !== 'airborne') b.state = 'airborne'

        if (b.y > canvas.height + BH) {
          const p0 = plats[0]
          if (p0) {
            b.x = p0.x + Math.random() * Math.max(0, p0.w - BW)
            b.y = p0.y - BH; b.vy = 0
            b.vx = WALK_VX * (Math.random() < 0.5 ? 1 : -1); b.facing = b.vx > 0 ? 1 : -1
            b.onGround = true; b.state = 'walk'; b.timer = 1
          }
        }

        // Particles
        ctx.font = '9px Menlo, "Courier New", monospace'
        for (let i = b.parts.length - 1; i >= 0; i--) {
          const p = b.parts[i]
          p.x += p.vx * dt; p.y += p.vy * dt
          if (!p.noGravity) p.vy += GRAVITY * dt
          p.life -= dt * (p.noGravity ? 1.0 : 2.8)
          if (p.life <= 0) { b.parts.splice(i, 1); continue }
          const pa = (dark ? 0.55 : 0.45) * p.life
          ctx.fillStyle = dark ? `rgba(255,255,255,${pa})` : `rgba(30,30,30,${pa})`
          ctx.fillText(p.ch, p.x, p.y)
        }

        drawBuddy(b)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      container.style.cursor = ''
      mo.disconnect(); ro.disconnect()
    }
  }, [containerRef])

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }} />
  )
}

// ─── Project card ──────────────────────────────────────────────────────────
interface ProjectCardProps {
  title: string
  description: string
  stack: string[]
  href?: string
  ogImage?: string | null
  index?: number
  mushPlat?: boolean
}

function ProjectCard({ title, description, stack, href, ogImage, index = 0, mushPlat }: ProjectCardProps) {
  const motionProps = {
    initial:    { opacity: 0, y: 12 } as const,
    whileInView: { opacity: 1, y: 0 } as const,
    viewport:   { once: true },
    transition: { duration: 0.25, delay: index * 0.07 },
  }
  const platAttr = mushPlat ? { 'data-mush-plat': '' } : {}

  const inner = (
    <>
      {ogImage && (
        <div style={{
          marginBottom: 10,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--colors-gray3)',
          lineHeight: 0,
        }}>
          <img
            src={ogImage}
            alt={title}
            loading="lazy"
            style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
          />
        </div>
      )}
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--colors-gray12)', fontFamily: 'var(--fonts-body)', display: 'block' }}>
        {title}
      </span>
      <span style={{ fontSize: 13, color: 'var(--colors-gray10)', fontFamily: 'var(--fonts-body)', display: 'block', marginTop: 3, lineHeight: '20px' }}>
        {description}
      </span>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
        {stack.map(s => (
          <span key={s} style={{ fontSize: 11, fontFamily: 'var(--fonts-mono)', color: 'var(--colors-gray8)' }}>
            {s.toLowerCase()}
          </span>
        ))}
      </div>
    </>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...platAttr}
        {...motionProps}
        whileHover={{ y: -2 }}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          borderTop: '1px solid var(--colors-gray4)',
          paddingTop: 12,
        }}
      >
        {inner}
      </motion.a>
    )
  }

  return (
    <motion.div
      {...platAttr}
      {...motionProps}
      style={{ borderTop: '1px solid var(--colors-gray4)', paddingTop: 12 }}
    >
      {inner}
    </motion.div>
  )
}

// ─── Skill group ──────────────────────────────────────────────────────────
const SKILL_GROUPS = [
  { label: 'data',      skills: ['Python', 'SQL', 'Spark', 'Structured Streaming', 'Airflow', 'Kafka'] },
  { label: 'platforms', skills: ['Databricks', 'Snowflake', 'AWS', 'MLflow', 'Feature Stores'] },
  { label: 'infra',     skills: ['Docker', 'Terraform', 'CI/CD'] },
  { label: 'frontend',  skills: ['JavaScript', 'Go'] },
]

function SkillGroup({ label, skills, index = 0 }: { label: string; skills: string[]; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 10 }}
    >
      <span style={{
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--colors-gray8)',
        fontFamily: 'var(--fonts-body)',
        minWidth: 72,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color: 'var(--colors-gray10)',
        fontFamily: 'var(--fonts-body)',
        lineHeight: '20px',
      }}>
        {skills.join(' · ')}
      </span>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
// Persists across client-side navigations, resets on full page reload
let sessionAnimPlayed = false

interface Props {
  ogImages: Record<string, string | null>
}

export default function Resume({ ogImages = {} }: Props) {
  const contentRef      = useRef<HTMLDivElement>(null)
  const mushWrapRef     = useRef<HTMLDivElement>(null)
  const [mushDone,     setMushDone]     = useState(sessionAnimPlayed)
  // Gate the projects section until the work-entry text animations above finish.
  // Work entries stagger up to ~0.33s delay + 0.25s duration + ~0.2s shuffle = ~0.8s.
  // Waiting 900ms lets everything settle before projects appears.
  const [currentlyAnimDone,  setCurrentlyAnimDone]  = useState(false)
  const [textAnimDone,       setTextAnimDone]       = useState(false)
  const [skillsAnimDone,     setSkillsAnimDone]     = useState(false)
  const [educationAnimDone,  setEducationAnimDone]  = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setCurrentlyAnimDone(true),  650)
    const t2 = setTimeout(() => setTextAnimDone(true),       900)
    const t3 = setTimeout(() => setSkillsAnimDone(true),    1300)
    const t4 = setTimeout(() => setEducationAnimDone(true), 1700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <>
      <SEO title="Work" description="Ben Sack — Engineer at Databricks. Building reliable systems and making complex things easier to run." />
      <div ref={contentRef} style={{ position: 'relative', zIndex: 2 }}>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.04, ease: 'easeOut' }}
      >
        <Box css={{ mb: '$3', display: 'flex', gap: '$2', flexWrap: 'wrap', ai: 'center' }}>
          <a href={`mailto:${resume.contact.email}`} style={{ fontSize: 13, color: 'var(--colors-gray10)', fontFamily: 'var(--fonts-body)', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
            {resume.contact.email}
          </a>
          <Text size="13" css={{ color: '$gray7' }}>·</Text>
          <a href={resume.contact.github} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--colors-gray10)', fontFamily: 'var(--fonts-body)', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
            GitHub
          </a>
          <Text size="13" css={{ color: '$gray7' }}>·</Text>
          <a href={resume.contact.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--colors-gray10)', fontFamily: 'var(--fonts-body)', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
            LinkedIn
          </a>
          <Text size="13" css={{ color: '$gray7' }}>·</Text>
          <a href={resume.contact.x} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--colors-gray10)', fontFamily: 'var(--fonts-body)', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray12)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
            X / Twitter
          </a>
        </Box>
      </motion.div>

      {/* Work */}
      <AnimatedLabel delay={0.08}>Experience</AnimatedLabel>
      <Box css={{ display: 'flex', flexDirection: 'column', gap: '$3' }}>
        {resume.work.map((job, i) => (
          <WorkEntry key={`${job.company}-${job.start}`} {...job} delay={0.13 + i * 0.1} />
        ))}
      </Box>

      {/* Currently + Previously */}
      <AnimatePresence>
        {currentlyAnimDone && (
          <motion.div
            key="currently"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Box css={{ display: 'flex', gap: '$4', alignItems: 'flex-start', '@mobile': { flexDirection: 'column', gap: '$3' } }}>
              <Box css={{ flex: 1 }}>
                <AnimatedLabel>Currently</AnimatedLabel>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resume.currently.map((item, i) => (
                    <RevealLine key={item.label} label={item.label} href={item.href} delay={i * 0.07} />
                  ))}
                </Box>
              </Box>

              <Box css={{ flex: 1 }}>
                <AnimatedLabel>Previously</AnimatedLabel>
                <Box css={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resume.previously.map((item, i) => (
                    <RevealLine key={item.label} label={item.label} href={item.href} delay={i * 0.06} />
                  ))}
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mushroom + Projects — mushroom walks on the card top-border lines */}
      <div ref={mushWrapRef} style={{ position: 'relative', marginTop: 24, paddingTop: 72, overflow: 'hidden' }}>
        {!sessionAnimPlayed && (
          <MushWalker
            wrapRef={mushWrapRef}
            onComplete={() => setMushDone(true)}
          />
        )}

        <AnimatePresence>
          {textAnimDone && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <AnimatedLabel data-platform="projects">Projects</AnimatedLabel>
              <Box css={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '$3',
                mt: '$1',
                '@mobile': { gridTemplateColumns: '1fr' },
              }}>
                {resume.projects.map((p, i) => (
                  <ProjectCard
                    key={p.title}
                    title={p.title}
                    description={p.description}
                    stack={p.stack}
                    href={p.href}
                    ogImage={ogImages[p.title] ?? null}
                    index={i}
                    mushPlat={i < 2}
                  />
                ))}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skills */}
      <AnimatePresence>
        {skillsAnimDone && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <AnimatedLabel>Skills</AnimatedLabel>
            <Box css={{ mt: '$1' }}>
              {SKILL_GROUPS.map((g, i) => (
                <SkillGroup key={g.label} label={g.label} skills={g.skills} index={i} />
              ))}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Education */}
      <AnimatePresence>
        {educationAnimDone && (
          <motion.div
            key="education"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <AnimatedLabel>Education</AnimatedLabel>
            {resume.education.map((e, i) => (
              <motion.div
                key={e.school}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i * 0.08, ease: 'easeOut' }}
              >
                <Box css={{ mb: '$1' }}>
                  <Text size="14" css={{ fontWeight: 500, color: '$gray12' }}>{e.school}</Text>
                  <Text size="13" color="gray11" css={{ lineHeight: '20px', mt: 3 }}>
                    {e.degree} · {e.minor} · {e.start}–{e.end}
                  </Text>
                </Box>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Box css={{ height: '$4' }} />
      <LineBuddies containerRef={contentRef} triggered={mushDone && educationAnimDone} />
      </div>
    </>
  )
}

// ─── Static props — fetch OG images for Shopify sites at build time ────────
export const getStaticProps: GetStaticProps<Props> = async () => {
  const ogImages: Record<string, string | null> = {}
  const shopifyTitles = new Set(['Bristol Studios', 'Streets Ahead', 'Literally Balling'])

  await Promise.all(
    resume.projects
      .filter(p => shopifyTitles.has(p.title) && p.href)
      .map(async ({ title, href }) => {
        try {
          const res = await fetch(href, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(8000),
          })
          const html = await res.text()
          const match =
            html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ||
            html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)
          ogImages[title] = match?.[1] ?? null
        } catch {
          ogImages[title] = null
        }
      })
  )

  return { props: { ogImages }, revalidate: 86400 }
}
