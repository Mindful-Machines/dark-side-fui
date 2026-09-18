import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_BASE / --base overrides the production base.
// - `npm run build` → /dark-side-fui/ for GitHub Pages
// - `npm run on-set` → / for LAN filming (see package.json)
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (command === 'build' ? '/dark-side-fui/' : '/'),
  // IP hosts are allowed by default; Cloudflare hosts kept for optional tunnels.
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
}))
