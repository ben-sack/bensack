/**
 * Shared "add some color" state — a global, persisted flag that flips the whole
 * site from grayscale into a hue-washed version (see components/ColorWash).
 *
 * The wash is a single `mix-blend-mode: color` overlay, so this store only needs
 * to track: whether it's on, where the ink should bleed from (viewport-percent
 * origin), a bump counter so listeners re-run, and whether the change should
 * animate (user toggle) or apply instantly (hydration from storage).
 *
 * Same module-level subscriber pattern as useSound / uiChrome.
 */
import { useEffect, useState } from 'react'

const KEY = '__color_on__'

export interface ColorOrigin { x: number; y: number } // viewport percentages 0–100

export interface ColorState {
  on: boolean
  origin: ColorOrigin
  seq: number
  animate: boolean
}

let state: ColorState = { on: false, origin: { x: 88, y: 94 }, seq: 0, animate: false }
let hydrated = false

const subscribers = new Set<(s: ColorState) => void>()

function emit() { subscribers.forEach((s) => s(state)) }

function readStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? false : JSON.parse(raw)
  } catch {
    return false
  }
}

// Called from the toggle — flips state and animates the wash from `origin`.
export function setColor(on: boolean, origin?: ColorOrigin): void {
  state = {
    on,
    origin: origin ?? state.origin,
    seq: state.seq + 1,
    animate: true,
  }
  try { localStorage.setItem(KEY, JSON.stringify(on)) } catch { /* ignore */ }
  emit()
}

export function toggleColor(origin?: ColorOrigin): void {
  setColor(!state.on, origin)
}

// Subscribe to the full color state (used by the overlay).
export function useColorState(): ColorState {
  const [value, setValue] = useState<ColorState>(state)

  useEffect(() => {
    // Apply the stored value once, without animating (instant on load/nav).
    if (!hydrated) {
      hydrated = true
      const on = readStorage()
      if (on !== state.on) {
        state = { ...state, on, seq: state.seq + 1, animate: false }
      }
    }
    setValue(state)

    const sub = (s: ColorState) => setValue(s)
    subscribers.add(sub)

    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      const on = e.newValue ? JSON.parse(e.newValue) : false
      state = { ...state, on, seq: state.seq + 1, animate: true }
      emit()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      subscribers.delete(sub)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return value
}

// Convenience for the dock button.
export function useColorToggle(): [boolean, (origin?: ColorOrigin) => void] {
  const s = useColorState()
  return [s.on, toggleColor]
}
