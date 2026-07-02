import { useEffect } from 'react'
import { useColorState } from '../lib/useColor'

// ─── ColorWash ───────────────────────────────────────────────────────────────
// Drives the DOM half of "add some color". Rather than laying a tint over the
// page, it recolors the *assets*: the ink-gray text/icon tokens are swapped for
// hues while the background tokens are left alone, so the page stays true
// white/black. Registering those tokens as typed <color> custom properties lets
// them transition, so the whole site eases into color (see globalStyles for the
// transition + the `.colorized` hue values). The ASCII canvases recolor
// themselves natively (see SignalField / AsciiGame).

const INK_TOKENS: Array<[string, string]> = [
  ['--colors-gray8',  'hsl(0 0% 78.0%)'],
  ['--colors-gray9',  'hsl(0 0% 56.1%)'],
  ['--colors-gray10', 'hsl(0 0% 52.3%)'],
  ['--colors-gray11', 'hsl(0 0% 43.5%)'],
  ['--colors-gray12', 'hsl(0 0% 9.0%)'],
]

let registered = false
function registerInkTokens() {
  if (registered || typeof window === 'undefined') return
  registered = true
  const reg = (window.CSS as unknown as { registerProperty?: (d: object) => void }).registerProperty
  if (!reg) return   // unsupported → tokens still swap, just without the ease
  for (const [name, initialValue] of INK_TOKENS) {
    try { reg({ name, syntax: '<color>', inherits: true, initialValue }) } catch { /* already registered */ }
  }
}

export default function ColorWash() {
  const { on } = useColorState()

  useEffect(() => { registerInkTokens() }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('colorized', on)
  }, [on])

  return null
}
