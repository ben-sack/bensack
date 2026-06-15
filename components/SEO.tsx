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
  const ogImageUrl = ogImage ? `${baseUrl}${ogImage}` : `${baseUrl}/og.png`
  const fullTitle = title ? `${title} — Ben Sack` : 'Ben Sack'

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Benjamin Sack" />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:url" content={canonicalUrl} key="og:url" />
      <meta property="og:title" content={fullTitle} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      <meta property="og:image" content={ogImageUrl} key="og:image" />
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:site" content="@bensack_" key="twitter:site" />
      <meta name="twitter:creator" content="@bensack_" key="twitter:creator" />
      <meta name="twitter:title" content={fullTitle} key="twitter:title" />
      <meta name="twitter:description" content={description} key="twitter:description" />
      <meta name="twitter:image" content={ogImageUrl} key="twitter:image" />
    </Head>
  )
}
