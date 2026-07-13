import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from '@modyfi/vite-plugin-yaml'

// Static site: YAML data files under /data are imported directly as JS objects
// at build time via the yaml plugin. No backend, no runtime fetch.
export default defineConfig({
  plugins: [react(), yaml()],
  base: './',
  // Pinned so the dev server and the VS Code debug config (launch.json) always
  // agree on a URL. strictPort fails loudly instead of drifting to 5177+.
  server: { port: 5176, strictPort: true },
  preview: { port: 5176, strictPort: true },
})
