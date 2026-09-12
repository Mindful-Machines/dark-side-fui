import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_BASE overrides the production base. Use VITE_BASE=/ for local/tunnel previews.
// Default build base remains /dark-side/ for GitHub Pages.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (command === 'build' ? '/dark-side/' : '/'),
  // Required so temporary Cloudflare Quick Tunnels can reach vite preview.
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
}))
