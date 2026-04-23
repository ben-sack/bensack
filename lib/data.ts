import { slugify } from './utils'

// ─── Resume ──────────────────────────────────────────────────────────────────
export const resume = {
  name: 'Ben Sack',
  location: 'Venice, CA',
  summary:
    'Engineer focused on building. reliable systems and making complex things easier to run.',
  contact: {
    email: 'contact@bensack.io',
    github: 'https://github.com/ben-sack',
    linkedin: 'https://www.linkedin.com/in/ben-sack',
    x: 'https://x.com/bensack_',
  },
  work: [
    {
      company: 'Databricks',
      title: 'Specialist Solutions Architect',
      start: '2025',
      end: 'Current',
      description:
        'Support Fortune 500 manufacturers on Databricks, focusing on streaming architecture, DevOps pipelines, and stabilizing production workloads.',
    },
    {
      company: 'Disney Streaming',
      title: 'Senior ML Platform Engineer',
      start: '2024',
      end: '2025',
      description:
        'Built parts of the recommendation backend and real-time feature store for the Hulu on Disney+ integration.',
    },
    {
      company: 'Disney Streaming',
      title: 'Senior Data Engineer',
      start: '2022',
      end: '2024',
      description:
        'Built subscriber metrics pipelines across Disney+, Hulu, and ESPN. Designed Fig, a config-driven ETL framework adopted org-wide.',
    },
    {
      company: 'Progressive Insurance',
      title: 'Senior Data Engineer',
      start: '2020',
      end: '2022',
      description:
        "Led key parts of Progressive's migration from on-prem to cloud and helped design the big data platform still in use.",
    },
    {
      company: 'Progressive Insurance',
      title: 'Systems Engineer',
      start: '2018',
      end: '2020',
      description:
        'Managed on-prem and cloud infrastructure, resolved production issues, and automated recurring operational tasks.',
    },
  ],
  education: [
    {
      school: 'Indiana University, Bloomington',
      degree: 'B.S. Computer Science',
      minor: 'Marketing & Business — Kelley School',
      start: '2014',
      end: '2018',
    },
  ],
  skills: [
    'Python', 'SQL', 'Spark', 'Structured Streaming', 'Snowflake',
    'AWS', 'Databricks', 'Airflow', 'MLflow', 'Feature Stores',
    'Kafka', 'Docker', 'Terraform', 'CI/CD', 'JavaScript', 'Go',
  ],
  currently: [
    { label: 'Specialist Solutions Architect at Databricks', href: 'https://databricks.com' },
    { label: 'bensack.io — this site' },
  ],
  previously: [
    { label: 'Fig — config-driven ETL framework, Disney Streaming' },
    { label: 'ML feature store for Hulu on Disney+ integration' },
    { label: 'Cloud data platform migration at Progressive Insurance' },
    { label: 'Bristol Studios — e-commerce consulting', href: 'https://bristol-studio.com/' },
    { label: 'Streets Ahead — Shopify build', href: 'https://streetsaheadinc.com' },
  ],
  projects: [
    {
      title: 'Fig',
      description: 'Internal Disney framework to structure and deploy data pipelines',
      stack: ['Python', 'Pydantic', 'PySpark', 'Snowpark', 'Databricks'],
      href: 'https://disneystreaming.com',
    },
    {
      title: 'Bristol Studios',
      description: 'Athlesure brand at the intersection of fashion and basketball',
      stack: ['Shopify', 'Liquid', 'JavaScript', 'Consulting'],
      href: 'https://bristol-studio.com/',
    },
    {
      title: 'Streets Ahead',
      description: 'Luxury leather goods brand, made in the USA',
      stack: ['Shopify', 'Liquid', 'JavaScript', 'Consulting'],
      href: 'https://streetsaheadinc.com',
    },
    {
      title: 'Literally Balling',
      description: 'Basketball brand focused on handmade garments',
      stack: ['Shopify', 'Liquid', 'JavaScript', 'Consulting'],
      href: 'https://literallyballing.com',
    },
  ],
}

// ─── Craft ───────────────────────────────────────────────────────────────────
export type GenArtType = 'flow-field' | 'reaction-diffusion' | 'truchet' | 'charge-field' | 'curl-flow' | 'strange-attractor'   // extend as new algos are added

export interface CraftItem {
  date: string
  title: string
  src?: string
  genArt?: { type: GenArtType; seed: number }
  component?: boolean
  href?: string
  wrap?: number | boolean
  requiresPointer?: boolean
  aspectRatio?: number
  dark?: boolean
  slowMotion?: boolean
}

export const craftItems: CraftItem[] = [
  { date: 'April 2025',   title: 'Flow Field I',        genArt: { type: 'flow-field',        seed: 0x1f4e8a } },
  { date: 'April 2025',   title: 'Flow Field II',       genArt: { type: 'flow-field',        seed: 0xa3c7d2 } },
  { date: 'April 2025',   title: 'Strange Attractor IV', genArt: { type: 'strange-attractor', seed: 0x056987 } },
  { date: 'April 2025',   title: 'Flow Field III',      genArt: { type: 'flow-field',        seed: 0x5e2b9f } },
  { date: 'April 2025',   title: 'Charge Field I',      genArt: { type: 'charge-field',      seed: 0x46b54e } },
  { date: 'April 2025',   title: 'Strange Attractor V',  genArt: { type: 'strange-attractor', seed: 0xcc7b43 } },
  { date: 'April 2025',   title: 'Charge Field II',     genArt: { type: 'charge-field',      seed: 0x01c9e1 } },
  { date: 'April 2025',   title: 'Charge Field III',    genArt: { type: 'charge-field',      seed: 0xb732e9 } },
  { date: 'April 2025',   title: 'Strange Attractor VI', genArt: { type: 'strange-attractor', seed: 0x008aa7 } },
  { date: 'April 2025',   title: 'Curl Flow I',         genArt: { type: 'curl-flow',         seed: 0x5d6cbc } },
  { date: 'April 2025',   title: 'Curl Flow II',        genArt: { type: 'curl-flow',         seed: 0x23cbfc } },
  { date: 'April 2025',   title: 'Strange Attractor VII', genArt: { type: 'strange-attractor', seed: 0x298698 } },
  { date: 'April 2025',   title: 'Curl Flow III',       genArt: { type: 'curl-flow',         seed: 0x848c9d } },
  { date: 'April 2025',   title: 'Strange Attractor I',  genArt: { type: 'strange-attractor',  seed: 0x0bb03b } },
  { date: 'April 2025',   title: 'Strange Attractor II', genArt: { type: 'strange-attractor',  seed: 0xaab83b } },
  { date: 'April 2025',   title: 'Strange Attractor III', genArt: { type: 'strange-attractor', seed: 0xde68e0 } },
  { date: 'April 2025',   title: 'Strange Attractor VIII', genArt: { type: 'strange-attractor', seed: 0x0b9a2d } },
  { date: 'April 2025',   title: 'Strange Attractor IX', genArt: { type: 'strange-attractor', seed: 0x97e470 } },
]

export const craftItemsWithIds = craftItems.map((item) => ({
  ...item,
  id: slugify(item.title),
}))
