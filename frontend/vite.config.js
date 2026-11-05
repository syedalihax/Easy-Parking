import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const publicSeoPlugin = {
  name: 'easyparking-public-sitemap',
  generateBundle() {
    const configuredSiteUrl = process.env.VITE_PUBLIC_SITE_URL
    if (!configuredSiteUrl) return

    let siteUrl
    try {
      siteUrl = new URL(configuredSiteUrl)
    } catch {
      throw new Error('VITE_PUBLIC_SITE_URL must be an absolute HTTPS origin.')
    }

    if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
      throw new Error('VITE_PUBLIC_SITE_URL must be an HTTPS origin without a path, query, or hash.')
    }

    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl.origin}/</loc></url>\n</urlset>\n`,
    })
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    publicSeoPlugin,
  ],
})

