import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://www.studioschatzi.at',
  output: 'static',
  adapter: cloudflare({prerenderEnvironment: 'node', imageService: 'passthrough'}),
  // Prebundle these runtime entries before the Cloudflare dev worker starts.
  vite: {optimizeDeps: {include: ['astro/app/manifest', 'astro/assets/services/noop']}},
  session: false,
});
