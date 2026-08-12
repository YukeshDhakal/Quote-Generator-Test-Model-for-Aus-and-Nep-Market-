import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const ssrDir = path.resolve(__dirname, '../dist-ssr')

async function main() {
  const { getAllSeoRoutes, SITE_URL } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')))
  const routes = getAllSeoRoutes()

  const urls = routes
    .map((route) => `  <url>\n    <loc>${SITE_URL}${route.path}</loc>\n  </url>`)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

  const outPath = path.join(distDir, 'sitemap.xml')
  await writeFile(outPath, xml, 'utf-8')
  console.log(`wrote sitemap.xml with ${routes.length} routes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
