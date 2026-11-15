// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// Static output. The public site is content-driven and prerendered at build
// time; React is mounted only where real interactivity is required.
//
// `site` is the canonical origin used for canonical links, the sitemap and
// robots.txt. It is read from SITE_URL so the same commit produces the same
// `dist/` in a container, in CI and in production. The default keeps local
// builds working without any environment setup.
const site = process.env.SITE_URL ?? 'https://ajn-portfolio.vercel.app';

export default defineConfig({
  output: 'static',
  site,
  adapter: vercel(),
  integrations: [
    // Scope React ONLY to .tsx files. Astro 7's built-in JSX renderer would
    // otherwise conflict with React and break .tsx files in dev mode.
    react({
      include: ['**/components/**/*.tsx', '**/islands/**/*.tsx'],
    }),
  ],
});
