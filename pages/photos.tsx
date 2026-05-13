import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/SEO'
import Box from '../components/Box'
import Text from '../components/Text'
import { shuffleLetters } from '../lib/utils'

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
          <Text size="14" color="gray11"></Text>
        </Box>
      </motion.div>
    </>
  )
}
