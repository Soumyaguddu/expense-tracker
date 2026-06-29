import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-router') || id.includes('react-dom')) return 'react-router'
            if (id.includes('@radix-ui')) return 'radix'
            return 'vendor'
          }
        },
      },
    },
  },
})
