import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// для dev-прокси можно переопределить адрес бекенда через переменную окружения
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3344'

export default defineConfig({
    plugins: [react()],
    // главное для сборки под Spring Boot static/
    base: './',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
    },
})
