import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteSeo, SITE_URL } from '../data/seo-routes'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(id: string, data: Record<string, unknown> | undefined) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo-jsonld="${id}"]`)
  if (!data) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-seo-jsonld', id)
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * Keeps document title/meta/canonical/JSON-LD correct as the user navigates client-side between
 * routes (SPA navigation doesn't reload the page, so nothing else would update these). The
 * *initial* HTML for crawlers and social-share bots comes from the separate build-time prerender
 * step (scripts/prerender.mjs), which reads this same seo-routes table — this hook only needs to
 * keep things correct after that first paint.
 */
export function useSeoHead() {
  const location = useLocation()

  useEffect(() => {
    const route = getRouteSeo(location.pathname)
    if (!route) return

    document.title = route.title
    setMeta('name', 'description', route.description)

    const canonicalUrl = `${SITE_URL}${route.path}`
    setCanonical(canonicalUrl)

    setMeta('property', 'og:title', route.title)
    setMeta('property', 'og:description', route.description)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', 'Quote Engine')

    setMeta('name', 'twitter:card', 'summary')
    setMeta('name', 'twitter:title', route.title)
    setMeta('name', 'twitter:description', route.description)

    setJsonLd('route', route.jsonLd)
  }, [location.pathname])
}
