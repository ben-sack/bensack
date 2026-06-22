import dynamic from 'next/dynamic'
import SEO from '../components/SEO'

// Canvas + Web Audio — client only, no SSR.
const AsciiGame = dynamic(() => import('../components/AsciiGame'), { ssr: false })

export default function Play() {
  return (
    <>
      <SEO title="Play" description="Buddy Run — a tiny ASCII arcade. Pick a buddy, jump the hazards, duck the birds, chase the sparkles." />
      <h1 className="vh">Buddy Run — an ASCII arcade game by Ben Sack.</h1>
      <AsciiGame />
    </>
  )
}
