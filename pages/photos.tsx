import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/SEO'
import Box from '../components/Box'
import Text from '../components/Text'

function shuffleLetters(el: HTMLElement, options: { iterations?: number } = {}) {
  const { iterations = 8 } = options
  const chars = 'abcdefghijklmnopqrstuvwxyz'
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

export default function Photos() {
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (labelRef.current) shuffleLetters(labelRef.current, { iterations: 10 })
  }, [])

  return (
    <>
      <SEO title="Photos" description="Selected photography and visual work." />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ maxWidth: 672, margin: '0 auto' }}
      >
        <Box css={{ mb: '$4' }}>
          <Text size="32" weight="500" color="gray12" css={{ letterSpacing: '-0.5px', mb: '$1' }}>
            <span ref={labelRef}>Photos</span>
          </Text>
          <Text size="14" color="gray11">Coming soon.</Text>
        </Box>
      </motion.div>
    </>
  )
}
