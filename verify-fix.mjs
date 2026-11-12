import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = process.env.OUT_DIR || join(process.cwd(), 'screenshots', 'admin-verify');
const BASE = process.env.BASE_URL || 'http://localhost:4321';
const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

const cookie = process.argv[2];
if (!cookie) {
  console.error('Usage: node verify-fix.mjs "auth_token=<value>"');
  process.exit(1);
}
const [name, value] = cookie.split('=', 2);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([{
  name: name.trim(), value: value.trim(),
  domain: 'localhost', path: '/',
  httpOnly: true, secure: false, sameSite: 'Strict',
}]);

const pages = [
  ['/admin', 'dashboard-fixed.png'],
  ['/admin/projects', 'projects-list-fixed.png'],
  ['/admin/projects/create', 'projects-create-fixed.png'],
  ['/admin/projects/mi-portfolio', 'projects-edit-fixed.png'],
  ['/admin/contributions', 'contributions-list-fixed.png'],
  ['/admin/contributions/create', 'contributions-create-fixed.png'],
  ['/admin/contributions/mi-portfolio', 'contributions-edit-fixed.png'],
];

for (const [path, filename] of pages) {
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.screenshot({ path: join(OUT, filename), fullPage: false });
  console.log(`✓ ${filename}`);
  await page.close();
}

await browser.close();
