import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js が大きいためバンドルサイズが 500KB を超える。
    // rolldown-vite は manualChunks のオブジェクト構文に非対応のため、警告閾値を引き上げて対応。
    chunkSizeWarningLimit: 1200,
  },
})
