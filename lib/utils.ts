export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

export const assetUrl = (filename: string, t = 0.01) =>
  `/assets/${filename}#t=${t}`

export const px = (v: number) => `${v}px`

export function shuffleLetters(el: HTMLElement, options: { iterations?: number } = {}) {
  const { iterations = 8 } = options
  const chars = 'abcdefghijklmnopqrstuvwxyz·—∙'
  const original = el.textContent ?? ''
  const letters = original.split('')
  const nonSpace = letters.reduce<number[]>((acc, c, i) => {
    if (!/\s/.test(c)) acc.push(i)
    return acc
  }, [])
  let timer: ReturnType<typeof setTimeout>
  function step(round: number) {
    if (round > nonSpace.length) { el.textContent = original; return }
    const cur = [...letters]
    for (let i = Math.max(round, 0); i < nonSpace.length; i++) {
      cur[nonSpace[i]] = i < round + iterations
        ? chars[Math.floor(Math.random() * chars.length)]
        : ''
    }
    el.textContent = cur.join('')
    timer = setTimeout(() => step(round + 1), 1000 / 30)
  }
  step(-iterations)
  return () => clearTimeout(timer)
}
