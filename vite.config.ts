/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/peerjs': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
