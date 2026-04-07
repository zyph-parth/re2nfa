import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // relative paths so it works on any subdirectory host (Netlify, GitHub Pages, etc.)
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
