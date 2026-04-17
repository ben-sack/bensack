import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/SEO'
import Box from '../components/Box'
import Text from '../components/Text'
import { css, keyframes, styled } from '../stitches.config'
import { resume } from '../lib/data'

// ─── Letter shuffle ────────────────────────────────────────────────────────
function shuffleLetters(el: HTMLElement, options: { iterations?: number } = {}) {
  const { iterations = 8 } = options
  const chars = 'abcdefghijklmnopqrstuvwxyz·—'
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

const skillCss = css({
  display: 'inline-block',
  fontSize: 12,
  color: '$gray11',
  background: '$gray3',
  border: '1px solid $gray5',
  borderRadius: '$1',
  px: 8,
  py: 4,
  fontFamily: '$body',
})

// ─── Work entry ────────────────────────────────────────────────────────────
interface WorkEntryProps {
  company: string
  title: string
  start: string
  end: string
  description: string
  index: number
}

function WorkEntry({ company, title, start, end, description, index }: WorkEntryProps) {
  const companyRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (companyRef.current) shuffleLetters(companyRef.current, { iterations: 6 })
    }, index * 80)
    return () => clearTimeout(t)
  }, [index])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 + index * 0.07 }}
    >
      <Box css={{ display: 'flex', justifyContent: 'space-between', ai: 'flex-start', mb: 4, gap: 12 }}>
        <Box>
          <span
            ref={companyRef}
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--colors-gray12)', fontFamily: 'var(--fonts-body)', display: 'block' }}
          >
            {company}
          </span>
          <Text size="13" color="gray11" css={{ mt: 2 }}>{title}</Text>
        </Box>
        <Text size="13" css={{ color: '$gray9', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {start} – {end}
        </Text>
      </Box>
      <Text size="14" color="gray11" css={{ lineHeight: '22px', mb: '$2' }}>
        {description}
      </Text>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Resume() {
  const nameRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (nameRef.current) shuffleLetters(nameRef.current, { iterations: 10 })
  }, [])

  return (
    <>
      <SEO title="Resume" description="Ben Sack — Engineer at Databricks. Building reliable systems and making complex things easier to run." />

      {/* Header */}
      <Box css={{ mb: '$4' }}>
        <h1
          ref={nameRef}
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--colors-gray12)',
            fontFamily: 'var(--fonts-body)',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {resume.name}
        </h1>
        <Text size="14" color="gray11" css={{ mt: '$1', mb: '$2', lineHeight: '22px' }}>
          {resume.summary}
        </Text>

        <Box css={{ display: 'flex', gap: '$2', flexWrap: 'wrap', ai: 'center' }}>
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
      </Box>

      <Divider />

      {/* Work */}
      <SectionLabel>Experience</SectionLabel>
      <Box css={{ display: 'flex', flexDirection: 'column', gap: '$3' }}>
        {resume.work.map((job, i) => (
          <WorkEntry key={`${job.company}-${job.start}`} {...job} index={i} />
        ))}
      </Box>

      <Divider />

      {/* Education */}
      <SectionLabel>Education</SectionLabel>
      {resume.education.map((edu, i) => (
        <motion.div key={edu.school} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.05 }}>
          <Box css={{ display: 'flex', justifyContent: 'space-between', ai: 'flex-start', gap: 12 }}>
            <Box>
              <Text size="14" weight="500" color="gray12">{edu.school}</Text>
              <Text size="13" color="gray11" css={{ mt: 2 }}>{edu.degree}</Text>
              <Text size="13" css={{ color: '$gray9', mt: 2 }}>{edu.minor}</Text>
            </Box>
            <Text size="13" css={{ color: '$gray9', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {edu.start} – {edu.end}
            </Text>
          </Box>
        </motion.div>
      ))}

      <Divider />

      {/* Skills */}
      <SectionLabel>Skills</SectionLabel>
      <Box css={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {resume.skills.map((skill) => (
          <span key={skill} className={skillCss()}>{skill}</span>
        ))}
      </Box>

      <Divider />

      {/* Projects */}
      <SectionLabel>Projects</SectionLabel>
      <Box css={{ display: 'flex', flexDirection: 'column', gap: '$3' }}>
        {resume.projects.map((project, i) => (
          <motion.div key={project.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.05 }}>
            <Box css={{ display: 'flex', justifyContent: 'space-between', ai: 'flex-start', gap: 12, mb: 4 }}>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--colors-gray12)', fontFamily: 'var(--fonts-body)', transition: 'color 150ms ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--colors-gray10)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}
              >
                {project.title}
              </a>
            </Box>
            <Text size="13" color="gray11" css={{ mb: '$1', lineHeight: '20px' }}>{project.description}</Text>
            <Box css={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {project.stack.map((tech) => (
                <span key={tech} className={skillCss()} style={{ fontSize: 11 }}>{tech}</span>
              ))}
            </Box>
          </motion.div>
        ))}
      </Box>
    </>
  )
}
