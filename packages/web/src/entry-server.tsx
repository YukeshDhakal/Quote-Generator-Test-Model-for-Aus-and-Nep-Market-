import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App'

export { getAllSeoRoutes, getRouteSeo, SITE_URL, type RouteSeo } from './data/seo-routes'

/**
 * SSR render entry, used only by scripts/prerender.mjs at build time — never served live. Auth
 * never resolves during this render (effects don't run in renderToString), so every route
 * renders in its logged-out state, which is exactly what a crawler with no session should see.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  )
}
