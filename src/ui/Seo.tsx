import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://nouploadmcp.app'

const pages: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': {
    title: 'No Upload — Private PDF Analysis with Local AI Agents',
    description: 'Analyze bank statements and lab reports with AI while your PDFs stay in your browser. Review extracted data, charts, and editable plans with human approval.',
  },
  '/finance': {
    title: 'Private Bank Statement Analysis & Savings Plans — No Upload',
    description: 'Analyze bank statement PDFs locally, approve transactions and categories, visualize spending, and build an editable savings plan with an AI agent.',
  },
  '/labs': {
    title: 'Private Lab Report Trends & Diet Plans — No Upload',
    description: 'Extract and review blood test results locally, visualize lab trends, and collaborate with an AI agent on an editable food-based plan.',
  },
  '/how-it-works': {
    title: 'How Local, Private AI Document Analysis Works — No Upload',
    description: 'Learn how No Upload uses local PDF processing, browser storage, consent, staged changes, and WebMCP tools to protect private documents.',
  },
  '/tools': {
    title: 'WebMCP Tool Reference — No Upload',
    description: 'Explore the structured WebMCP tools No Upload exposes for private document extraction, analysis, charts, plans, consent, and review.',
  },
  '/disclosures': {
    title: 'Privacy, Scope & Disclosures — No Upload',
    description: 'Review No Upload privacy boundaries, local-processing guarantees, supported workflows, and financial and health safety limitations.',
  },
  '/audit': { title: 'Local Audit Log — No Upload', description: 'Review local disclosure decisions and agent activity.', index: false },
  '/grants': { title: 'Local Consent Grants — No Upload', description: 'Manage local document disclosure permissions.', index: false },
}

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
}

export default function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = pages[pathname] ?? pages['/']
    const canonicalPath = page.index === false ? '/' : pathname
    const canonical = `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`

    document.title = page.title
    setMeta('meta[name="description"]', page.description)
    setMeta('meta[name="robots"]', page.index === false
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    setMeta('meta[property="og:title"]', page.title)
    setMeta('meta[property="og:description"]', page.description)
    setMeta('meta[property="og:url"]', canonical)
    setMeta('meta[name="twitter:title"]', page.title)
    setMeta('meta[name="twitter:description"]', page.description)
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonical)
  }, [pathname])

  return null
}
