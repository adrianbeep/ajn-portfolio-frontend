// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// Static output. The public site is content-driven and prerendered at build
// time, and it ships no framework in the client: the only external script is
// a 5 KB module that draws the hero's background in canvas.
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
    // React is installed and scoped to `.tsx`, but the project has NO islands
    // today: there is not a single `.tsx` file in `src/`. It stays because the
    // admin panel (documented in the backend contract, with its API ready) is
    // written in React, and scoping it to `.tsx` means the public site never
    // downloads the framework.
    //
    // The scope is explicit because Astro 7's built-in JSX renderer would
    // otherwise conflict with React and break `.tsx` files in dev mode.
    react({
      include: ['**/components/**/*.tsx', '**/islands/**/*.tsx'],
    }),
  ],
});
