import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import type { Plugin } from 'vite'

// Pages can't send headers, so ship the CSP as a meta tag on real builds.
// Dev (inline HMR script) and the single-file build (inline bundle) skip it.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// Single source of truth for the GitHub Pages repo path. The workflow overrides
// base with the same value, but keep build defaults agreeing so local `vite build`
// output is Pages-correct too.
const PAGES_BASE = '/Ledger-Project/'

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [cspMeta()])],
  // '/' for `vite dev` (local dev server semantics), PAGES_BASE for builds
  base: mode === 'development' ? '/' : PAGES_BASE,
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 900,
    // Single-file output for the QA preview; normal builds stay multi-chunk
    ...(mode === 'singlefile'
      ? {
          outDir: 'dist_single',
          rollupOptions: { output: { inlineDynamicImports: true } },
          assetsInlineLimit: 100_000_000,
        }
      : {
        rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom', 'react-router-dom'],
              motion: ['framer-motion'],
            },
          },
        },
      }),
  },
}))
