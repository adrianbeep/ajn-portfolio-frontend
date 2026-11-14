// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// Static output. The public site is content-driven and prerendered at build
// time; React is mounted only where real interactivity is required.
export default defineConfig({
  output: 'static',
  site: 'https://ajn-portfolio.vercel.app',
  adapter: vercel(),
  integrations: [
    // Scope React ONLY to .tsx files. Astro 7's built-in JSX renderer would
    // otherwise conflict with React and break .tsx files in dev mode.
    react({
      include: ['**/components/**/*.tsx', '**/islands/**/*.tsx'],
    }),
  ],
});
