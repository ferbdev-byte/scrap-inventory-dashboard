import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: đường dẫn khi deploy lên GitHub Pages (https://ferbdev-byte.github.io/scrap-inventory-dashboard/)
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/scrap-inventory-dashboard/' : '/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
} as never)
