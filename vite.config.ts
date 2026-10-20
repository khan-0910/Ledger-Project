import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

// Single source of truth for the GitHub Pages repo path. The workflow overrides
// base with the same value, but keep build defaults agreeing so local `vite build`
// output is Pages-correct too.
const PAGES_BASE = '/Ledger-Project/'

export default defineConfig(({ mode }) => ({
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
