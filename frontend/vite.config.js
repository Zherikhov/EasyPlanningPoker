import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Прокси для API, чтобы запросы с фронта попадали на Spring Boot в dev-режиме
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // Никакого переписывания не требуется: путь /api/v1/... должен дойти как есть
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
