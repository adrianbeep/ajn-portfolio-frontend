// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [
    // Scope React ONLY to .tsx files. Astro 7's built-in JSX renderer would
    // otherwise conflict with React and break all .tsx files in dev mode.
    react({
      include: ['**/components/**/*.tsx', '**/islands/**/*.tsx'],
    }),
  ],
  vite: {
    css: {
      preprocessorOptions: {},
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5239',
          changeOrigin: true,
          // Don't rewrite the path — /api/projects -> localhost:5239/projects
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  },
});