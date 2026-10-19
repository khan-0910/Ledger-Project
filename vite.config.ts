import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
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
