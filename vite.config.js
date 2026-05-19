import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: null,
        rollupFormat: 'iife'
      },
      manifest: {
        short_name: "Wozan",
        name: "Wozan Mass Builder",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml"
          }
        ],
        start_url: "/",
        display: "standalone",
        theme_color: "#0f172a",
        background_color: "#0f172a"
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Prevent aggressive asset filename locking to avoid 404 cache mismatch post-deployment
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})

