// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the draft under /osh; Cloudflare Pages will serve from /.
// Both come from env so the same code builds for either target.
const site = process.env.SITE_URL;
const base = process.env.BASE_PATH ?? '/';
// DRAFT=true renders unreplaced {{PLACEHOLDER}}s as visible "TBD" markers and
// shows the draft banner. Off for real traffic. Injected at build time.
const draft = process.env.DRAFT === 'true';

export default defineConfig({
  output: 'static',
  site,
  base,
  vite: {
    plugins: [tailwindcss()],
    define: { 'import.meta.env.DRAFT': JSON.stringify(String(draft)) },
  },
});
