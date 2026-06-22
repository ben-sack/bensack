/**
 * Tiny shared flag for hiding global UI chrome (the Dock) while something
 * full-screen and interactive is running — e.g. the /play arcade during a run.
 * Same subscriber pattern as useSoundEnabled so any component stays in sync.
 */
import { useEffect, useState } from 'react'

let hidden = false
const subscribers = new Set<(v: boolean) => void>()

export function setChromeHidden(v: boolean): void {
  if (hidden === v) return
  hidden = v
  subscribers.forEach((s) => s(v))
}

export function useChromeHidden(): boolean {
  const [value, setValue] = useState(hidden)
  useEffect(() => {
    const sub = (v: boolean) => setValue(v)
    subscribers.add(sub)
    setValue(hidden)
    return () => { subscribers.delete(sub) }
  }, [])
  return value
}
