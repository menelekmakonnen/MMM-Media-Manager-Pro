import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for Electron
  resolve: {
    alias: {
      '@mmm-pro': path.resolve(__dirname, '../MMMedia Pro/src'),
    }
  },
  server: {
    port: 9797,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: []
  }
})
