import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const ssrDir = path.resolve(__dirname, '../dist-ssr')

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildHead(route, siteUrl) {
  const canonical = `${siteUrl}${route.path}`
  const parts = [
    `<meta name="description" content="${escapeHtml(route.description)}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${escapeHtml(route.title)}">`,
    `<meta property="og:description" content="${escapeHtml(route.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Quote Engine">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}">`,
  ]
  if (route.jsonLd) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`)
  }
  return parts.join('\n    ')
}

async function main() {
  const { render, getAllSeoRoutes, SITE_URL } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')))
  const template = await readFile(path.join(distDir, 'index.html'), 'utf-8')
  const routes = getAllSeoRoutes()

  for (const route of routes) {
    const appHtml = render(route.path)
    let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    html = html.replace('</head>', `    ${buildHead(route, SITE_URL)}\n  </head>`)

    const outPath =
      route.path === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.path.slice(1), 'index.html')
    await mkdir(path.dirname(outPath), { recursive: true })
    await writeFile(outPath, html, 'utf-8')
    console.log(`prerendered ${route.path} -> ${path.relative(distDir, outPath)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
