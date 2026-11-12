import { chromium } from 'playwright-core';
import { join } from 'path';

const DIR = process.env.WIREFRAME_DIR || join(process.cwd(), 'wireframes');
const samples = [
  { num: '01', name: 'icon-sidebar' },
  { num: '05', name: 'three-column' },
  { num: '08', name: 'editorial' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

for (const s of samples) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  // Set dark via localStorage before navigation
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const file = `aj-wireframe-${s.num}-${s.name}.html`;
  const url = `file://${join(DIR, file)}`;
  const out = join(DIR, `preview-${s.num}-desktop-dark.png`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`Dark  ${file}`);
  await context.close();
}

await browser.close();
console.log('Dark mode screenshots done.');
