/**
 * Verify the editorial admin CRUD by taking screenshots of every
 * page (list / create / edit) for both projects and contributions,
 * at desktop and mobile viewports.
 *
 * Usage: node verify-admin.mjs
 *
 * Requires:
 *   - Frontend dev server running on http://localhost:4321
 *   - Backend running on http://localhost:5239 with an admin user seeded
 *
 * Env vars (no credentials are hardcoded):
 *   ADMIN_EMAIL     - admin account email            (required)
 *   ADMIN_PASSWORD  - admin account password         (required)
 *   BASE_URL        - frontend dev server            (default: http://localhost:4321)
 *   API_URL         - backend base URL               (default: http://localhost:5239)
 *   OUT_DIR         - screenshot output directory     (default: ./screenshots/admin-verify)
 *   CHROMIUM_PATH   - chromium executable            (default: /usr/bin/chromium)
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = process.env.OUT_DIR || join(process.cwd(), 'screenshots', 'admin-verify');
const BASE = process.env.BASE_URL || 'http://localhost:4321';
const API = process.env.API_URL || 'http://localhost:5239';
const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

// Admin credentials come from the environment. This script never stores them.
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing ADMIN_EMAIL and/or ADMIN_PASSWORD environment variables.');
  console.error('Usage: ADMIN_EMAIL=… ADMIN_PASSWORD=… node verify-admin.mjs');
  process.exit(1);
}

const PAGES = [
  { slug: 'projects-list',         path: '/admin/projects' },
  { slug: 'projects-create',       path: '/admin/projects/create' },
  { slug: 'projects-edit',         path: '/admin/projects/mi-portfolio' },
  { slug: 'contributions-list',    path: '/admin/contributions' },
  { slug: 'contributions-create',  path: '/admin/contributions/create' },
  { slug: 'contributions-edit',    path: '/admin/contributions/mi-portfolio' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 375,  height: 812 },
];

mkdirSync(OUT, { recursive: true });

// 1. Login via the BACKEND to get a fresh cookie value (the backend at
//    http://localhost:5239 sets the cookie; the dev server at 4321 just
//    proxies /api -> backend). We use Node's fetch to grab the cookie.
console.log('Logging in to backend…');
const loginRes = await fetch(`${API}/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginRes.ok) {
  throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
}
const setCookie = loginRes.headers.get('set-cookie');
if (!setCookie) throw new Error('No Set-Cookie from backend');
const cookieValue = setCookie.split(';')[0]; // "auth_token=eyJ…"
console.log(`  cookie: ${cookieValue.slice(0, 40)}…`);

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const issues = [];
let okCount = 0;

for (const vp of VIEWPORTS) {
  console.log(`\n--- ${vp.name} (${vp.width}×${vp.height}) ---`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });

  await context.addCookies([{
    name: 'auth_token',
    value: cookieValue.split('=', 2)[1],
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }]);

  for (const page of PAGES) {
    const url = `${BASE}${page.path}`;
    const outFile = join(OUT, `${page.slug}-${vp.name}.png`);
    const tab = await context.newPage();
    try {
      const resp = await tab.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const status = resp?.status() ?? 0;
      // Wait an extra beat for fonts/transitions
      await tab.waitForTimeout(500);
      await tab.screenshot({ path: outFile, fullPage: vp.name === 'desktop' });
      if (status >= 400) {
        console.log(`  ERR ${page.slug}-${vp.name}  HTTP ${status}  ${outFile}`);
        issues.push({ page: page.slug, viewport: vp.name, status });
      } else {
        console.log(`  OK  ${page.slug}-${vp.name}  ${outFile}`);
        okCount += 1;
      }
    } catch (err) {
      console.log(`  ERR ${page.slug}-${vp.name}  ${err.message}`);
      issues.push({ page: page.slug, viewport: vp.name, error: err.message });
    }
    await tab.close();
  }
  await context.close();
}

await browser.close();

console.log(`\n${okCount}/12 screenshots taken.`);
if (issues.length) {
  console.log('\nIssues:');
  for (const i of issues) console.log(' -', JSON.stringify(i));
  process.exit(1);
}
