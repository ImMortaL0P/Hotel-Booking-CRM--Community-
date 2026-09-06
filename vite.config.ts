import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.RENDER ? '/' : '/Hotel-Booking-CRM--Community-/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Listen on all local IP addresses
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true
      }
    }
  }
})
