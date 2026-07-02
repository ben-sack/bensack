import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { BUDDY_BODIES, BUDDY_EYES, mirrorLine } from '../lib/buddies'

// ─── GameBuddy ───────────────────────────────────────────────────────────────
// The arcade easter egg. A single mushroom peeks in from either edge at a random
// height — the same lean-around-the-corner move the /work page mushroom makes —
// and instead of yanking a lever it pauses. Click it and it zooms toward you
// before routing to the hidden /play arcade. Replaces the old set of stationary
// NPCs, which read as out of place next to the roaming buddies.

interface Props {
  /** Only active while the playground/world is revealed. */
  visible: boolean
  mobile: boolean
}

const SPECIES = 'mushroom'

// Render one mushroom frame, swapping the '·' eye placeholder for the live glyph.
// `faceLeft` mirrors the art so it can look back into the scene from either edge.
function spriteText(frame: number, eye: string, faceLeft: boolean): string {
  const frames = BUDDY_BODIES[SPECIES] ?? BUDDY_BODIES.duck
  const lines = frames[frame % frames.length]
  return lines.map((line) => (faceLeft ? mirrorLine(line) : line)).join('\n').replace(/·/g, eye)
}

type Side = 'left' | 'right'
interface Spot { side: Side; top: number }

// Pick a fresh edge + height for the next peek so it never repeats the same spot.
function randomSpot(mobile: boolean): Spot {
  const side: Side = Math.random() < 0.5 ? 'left' : 'right'
  const [lo, hi] = mobile ? [46, 62] : [34, 74]
  const top = Math.round(lo + Math.random() * (hi - lo))
  return { side, top }
}

type Phase = 'hidden' | 'peeked' | 'ducked'

export default function GameBuddy({ visible, mobile }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('hidden')
  const [spot, setSpot] = useState<Spot>(() => randomSpot(mobile))
  const [moving, setMoving] = useState(false)
  const [noTransition, setNoTransition] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [frame, setFrame] = useState(0)
  const [eyeIdx, setEyeIdx] = useState(0)
  const launchingRef = useRef(false)

  // Peek/duck loop — the buddy leans in, waits, and if ignored ducks back out
  // and returns from a new spot a little later, so it keeps drawing the eye
  // without nagging or ever appearing in the same place twice in a row.
  useEffect(() => {
    if (!visible) { setPhase('hidden'); return }
    launchingRef.current = false
    setLaunching(false)
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const wait = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }

    const showPeek = () => {
      if (cancelled || launchingRef.current) return
      // Re-home to a new edge/height while off-screen with transitions off, so
      // switching sides never animates a slide across the middle of the screen.
      setNoTransition(true)
      setSpot(randomSpot(mobile))
      setPhase('ducked')
      wait(40, () => {
        if (cancelled || launchingRef.current) return
        setNoTransition(false)
        setMoving(true)
        setPhase('peeked')
        wait(700, () => !cancelled && setMoving(false))
      })
      wait(6800, hidePeek)
    }
    const hidePeek = () => {
      if (cancelled || launchingRef.current) return
      setMoving(true)
      setPhase('ducked')
      wait(700, () => !cancelled && setMoving(false))
      wait(4200, showPeek)
    }

    wait(1100, showPeek)
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [visible, mobile])

  // One cheap shared timer animates the sprite — faster while sliding in/out so
  // the entrance reads as a little walk, slower when settled into an idle bob.
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % 3)
      setEyeIdx((e) => (e + 1) % BUDDY_EYES.length)
    }, moving ? 150 : 520)
    return () => window.clearInterval(id)
  }, [visible, moving])

  function launch() {
    if (launchingRef.current) return
    launchingRef.current = true
    setLaunching(true)
  }

  if (!visible) return null

  const shown = phase === 'peeked'
  const isLeft = spot.side === 'left'
  const offset = shown ? (mobile ? 42 : 62) : 132
  const tx = isLeft ? -offset : offset
  const rot = shown ? (isLeft ? 18 : -18) : 0
  const slide = noTransition ? 'none' : 'transform 700ms cubic-bezier(.25,.46,.45,.94)'

  return (
    <>
      <style>{`
        @keyframes npcBob { 0%,100% { margin-top: 0 } 50% { margin-top: -4px } }
        @keyframes gameBuddyBubble { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }
        @keyframes gameLaunchFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gameLaunchZoom {
          0%   { transform: scale(0.7) translateY(24px); opacity: 0.25 }
          40%  { transform: scale(1.15) translateY(0);   opacity: 1 }
          100% { transform: scale(2.8) translateY(-36px); opacity: 0 }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          [isLeft ? 'left' : 'right']: 6,
          top: `${spot.top}vh`,
          zIndex: 3,
          transform: `translateX(${tx}px)`,
          opacity: launching ? 0 : 1,
          transition: noTransition ? 'none' : 'transform 700ms cubic-bezier(.25,.46,.45,.94), opacity 200ms ease',
          pointerEvents: shown && !launching ? 'auto' : 'none',
        }}
      >
        <button
          aria-label="follow the buddy to a hidden game"
          onClick={launch}
          style={{
            position: 'relative',
            display: 'block',
            background: 'transparent',
            border: 0,
            padding: 8,
            margin: 0,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <pre
            aria-hidden
            style={{
              margin: 0,
              fontFamily: 'Menlo, "Courier New", monospace',
              fontSize: mobile ? 10 : 13,
              lineHeight: 1.05,
              whiteSpace: 'pre',
              color: 'var(--colors-gray10)',
              textShadow: '0 0 18px var(--colors-gray1)',
              transform: `rotate(${rot}deg)`,
              transformOrigin: isLeft ? 'bottom left' : 'bottom right',
              transition: slide,
              animation: shown && !moving ? 'npcBob 3.2s ease-in-out infinite' : 'none',
            }}
          >
            {spriteText(frame, BUDDY_EYES[eyeIdx], !isLeft)}
          </pre>
        </button>
      </div>

      {launching && <GameLaunch mobile={mobile} onDone={() => router.push('/play', undefined, { scroll: false })} />}
    </>
  )
}

// Full-screen hand-off: the mushroom rushes toward the viewer, then we route.
function GameLaunch({ mobile, onDone }: { mobile: boolean; onDone: () => void }) {
  const [frame, setFrame] = useState(0)
  // Keep the latest callback in a ref so parent re-renders (the idle frame timer
  // upstream) don't reset the navigation timeout before it fires.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    const anim = window.setInterval(() => setFrame((f) => (f + 1) % 3), 110)
    const trip = window.setTimeout(() => onDoneRef.current(), 1100)
    return () => { window.clearInterval(anim); window.clearTimeout(trip) }
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--colors-grayA3)',
        backdropFilter: 'blur(8px)',
        animation: 'gameLaunchFade 260ms ease',
      }}
    >
      <pre
        style={{
          margin: 0,
          fontFamily: 'Menlo, "Courier New", monospace',
          fontSize: mobile ? 14 : 20,
          lineHeight: 1.05,
          whiteSpace: 'pre',
          color: 'var(--colors-gray12)',
          textShadow: '0 0 28px var(--colors-gray1)',
          animation: 'gameLaunchZoom 1100ms cubic-bezier(.5,0,.35,1) forwards',
        }}
      >
        {spriteText(frame, '◉', true)}
      </pre>
      <span
        style={{
          marginTop: 20,
          fontFamily: 'var(--fonts-body)',
          fontSize: 12,
          textTransform: 'lowercase',
          letterSpacing: '0.1em',
          color: 'var(--colors-gray10)',
          animation: 'gameBuddyBubble 1s ease-in-out infinite',
        }}
      >
        entering the arcade…
      </span>
    </div>
  )
}
