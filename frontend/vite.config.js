import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'easyParking — Parking Management',
        short_name: 'easyParking',
        description: 'Manage parking members, vehicles, monthly subscriptions, payments, and daily parking.',
        theme_color: '#087F5B',
        background_color: '#F4F1E8',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,txt,woff2,webmanifest}'],
      },
    }),
  ],
})
