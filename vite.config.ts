import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// PWA plugin causes build failures on paths with parentheses/special chars
// Enable only in CI/Vercel where paths are clean
const enablePWA = process.env.DISABLE_PWA !== 'true'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(enablePWA ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'manifest.json'],
      manifest: {
        name: 'DM Companion',
        short_name: 'DM Log',
        description: 'Companion app for Chemical Water Treatment Plant operators',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    })] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
})