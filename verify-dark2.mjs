import { chromium } from 'playwright-core';
import { join } from 'path';

const DIR = process.env.WIREFRAME_DIR || join(process.cwd(), 'wireframes');
const files = [
  ['02', 'wide-sidebar'],
  ['03', 'top-nav'],
  ['04', 'dual-sidebar'],
  ['06', 'card-heavy'],
  ['07', 'list-heavy'],
  ['09', 'compact'],
  ['10', 'minimal'],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

for (const [num, name] of files) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const file = `aj-wireframe-${num}-${name}.html`;
  const url = `file://${join(DIR, file)}`;
  const out = join(DIR, `preview-${num}-desktop-dark.png`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`Dark  ${file}`);
  await context.close();
}

await browser.close();
console.log('Done.');
