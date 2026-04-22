import Head from 'next/head'
import { useRouter } from 'next/router'

const DEFAULT_BASE_URL = 'https://bensack.io'

interface SEOProps {
  title?: string
  description?: string
  ogImage?: string
}

export default function SEO({
  title,
  description = 'Engineer. Maker. Venice.',
  ogImage,
}: SEOProps) {
  const router = useRouter()
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const path = router.asPath.split('#')[0]
  const canonicalUrl = `${baseUrl}${path === '/' ? '' : path}`
  const ogImageUrl = ogImage ? `${baseUrl}${ogImage}` : `${baseUrl}/og.svg`
  const fullTitle = title ? `${title} — Ben Sack` : 'Ben Sack'

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@bensack_" />
      <meta name="twitter:creator" content="@bensack_" />
    </Head>
  )
}
