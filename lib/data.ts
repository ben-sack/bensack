import { assetUrl, slugify } from './utils'

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
    { label: 'Bristol Studios — e-commerce consulting', href: 'https://bristol-studios.com' },
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
      href: 'https://bristol-studios.com',
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
export interface CraftItem {
  date: string
  title: string
  src: string
  component?: boolean
  href?: string
  wrap?: number | boolean
  requiresPointer?: boolean
  aspectRatio?: number
  dark?: boolean
  slowMotion?: boolean
}

export const craftItems: CraftItem[] = [
  { date: 'January 2023', title: 'Beaded Necklace', src: assetUrl('peach.mp4'), component: true, wrap: 420, requiresPointer: true },
  { date: 'January 2023', title: 'Leather Jacket', src: assetUrl('peach.mp4'), component: true, wrap: 420, requiresPointer: true },
  { date: 'January 2023', title: 'Studded Belt', src: assetUrl('peach.mp4'), component: true, wrap: 420, requiresPointer: true },
  { date: 'January 2023', title: 'Vanish Input', src: assetUrl('peach.mp4'), component: true },
  { date: 'January 2023', title: 'Radial Menu', src: assetUrl('peach.mp4'), component: true, wrap: 500, dark: true },
  { date: 'January 2023', title: 'Precision Slider', src: assetUrl('peach.mp4'), wrap: true, dark: true },
  { date: 'January 2023', title: 'Wheel Input', src: assetUrl('peach.mp4'), component: true },
  { date: 'December 2022', title: '⌘K Breadcrumbs', src: assetUrl('peach.mp4') },
  { date: 'December 2022', title: 'Preview Comments', src: assetUrl('peach.mp4'), href: '' },
  { date: 'November 2022', title: 'Cryptic List', src: assetUrl('peach.mp4') },
  { date: 'November 2022', title: 'Vercel Footer', src: assetUrl('peach.mp4'), component: true, dark: true, requiresPointer: true },
  { date: 'September 2022', title: 'Gooey Shader', src: assetUrl('gooey.mp4') },
  { date: 'September 2022', title: 'Mirror Shader', src: assetUrl('stripes.mp4') },
  { date: 'September 2022', title: 'Flume Shader', src: assetUrl('flume.mp4') },
  { date: 'September 2022', title: 'Tangerine Shader', src: assetUrl('peach.mp4') },
  { date: 'July 2022', title: 'Signatures', src: assetUrl('peach.mp4') },
  { date: 'July 2022', title: 'Design Details', src: assetUrl('peach.mp4') },
  { date: 'July 2022', title: 'Sticky Video', src: assetUrl('peach.mp4') },
  { date: 'July 2022', title: 'Focus Reading', src: assetUrl('peach.mp4') },
  { date: 'May 2022', title: 'Visual Writing', src: assetUrl('peach.mp4') },
  { date: 'May 2022', title: 'Animated Typing', src: assetUrl('peach.mp4') },
  { date: 'April 2022', title: 'Microinteractions I', src: assetUrl('peach.mp4') },
  { date: 'April 2022', title: 'Microinteractions II', src: assetUrl('peach.mp4') },
  { date: 'March 2022', title: 'Blurred Icons', src: assetUrl('peach.mp4') },
  { date: 'April 2022', title: 'Arc Teaser', src: assetUrl('peach.mp4') },
  { date: 'March 2022', title: 'Website Presentation', src: assetUrl('peach.mp4') },
]

export const craftItemsWithIds = craftItems.map((item) => ({
  ...item,
  id: slugify(item.title),
}))
