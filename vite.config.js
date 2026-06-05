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
  // Vitest 用設定（vite.config.js 内に持つことで vite と設定共有できる）
  // R3F/Three.js を直接呼ばない純粋関数（systems/MapGenerator など）が主な対象なので
  // 環境は node で十分。jsdom が必要になったらテスト側で `// @vitest-environment jsdom` を指定する。
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
    globals: false,
  },
})
