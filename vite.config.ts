import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  // Base path for GitHub Pages deployment
  // Set to '/<repo-name>/' for project pages, or '/' for user/org pages
  base: '/photo-edit-comparison-webapp/',
})
