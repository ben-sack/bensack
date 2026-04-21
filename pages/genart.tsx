import { useState } from 'react'
import dynamic from 'next/dynamic'
import SEO from '../components/SEO'
import type { GenArtType } from '../lib/data'

const GenArt = dynamic(() => import('../components/GenArt'), { ssr: false })

const ALGOS: { id: GenArtType; label: string }[] = [
  { id: 'flow-field',         label: 'flow field'         },
  { id: 'reaction-diffusion', label: 'reaction diffusion' },
  { id: 'truchet',            label: 'truchet'            },
  { id: 'charge-field',       label: 'charge field'       },
  { id: 'curl-flow',          label: 'curl flow'          },
  { id: 'strange-attractor',  label: 'strange attractor'  },
]

const btn = (active: boolean): React.CSSProperties => ({
  fontSize:      11,
  fontFamily:    'var(--fonts-body)',
  textTransform: 'lowercase',
  letterSpacing: '0.02em',
  color:          active ? 'var(--colors-gray12)' : 'var(--colors-gray8)',
  background:    'transparent',
  border:         0,
  cursor:        'pointer',
  padding:        0,
  transition:    'color 150ms ease',
})

export default function GenArtSandbox() {
  const [type, setType] = useState<GenArtType>('flow-field')

  return (
    <>
      <SEO title="GenArt" description="Generative art sandbox." />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{
          fontSize:      11,
          color:        'var(--colors-gray8)',
          fontFamily:   'var(--fonts-body)',
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
          width:          40,
        }}>
          algo
        </span>
        {ALGOS.map(({ id, label }, i) => (
          <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: 'var(--colors-gray6)', fontSize: 11 }}>·</span>}
            <button onClick={() => setType(id)} style={btn(type === id)}>
              {label}
            </button>
          </span>
        ))}
      </div>

      <GenArt
        type={type}
        style={{
          width:        '100%',
          height:       'calc(100vh - 220px)',
          minHeight:     360,
          borderRadius:  8,
          border:       '1px solid var(--colors-gray4)',
        }}
      />
    </>
  )
}
