import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIR = process.env.WIREFRAME_DIR || join(process.cwd(), 'wireframes');
const files = [
  'aj-wireframe-01-icon-sidebar.html',
  'aj-wireframe-02-wide-sidebar.html',
  'aj-wireframe-03-top-nav.html',
  'aj-wireframe-04-dual-sidebar.html',
  'aj-wireframe-05-three-column.html',
  'aj-wireframe-06-card-heavy.html',
  'aj-wireframe-07-list-heavy.html',
  'aj-wireframe-08-editorial.html',
  'aj-wireframe-09-compact.html',
  'aj-wireframe-10-minimal.html',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const issues = [];

for (const file of files) {
  const num = file.match(/wireframe-(\d+)/)[1];
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `file://${join(DIR, file)}`;
    const out = join(DIR, `preview-${num}-${vp.name}.png`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      // Give fonts a moment
      await page.waitForTimeout(400);
      await page.screenshot({ path: out, fullPage: false });
      console.log(`OK  ${vp.name.padEnd(7)} ${file}  →  ${out}`);
    } catch (e) {
      console.error(`ERR ${vp.name.padEnd(7)} ${file}: ${e.message}`);
      issues.push({ file, viewport: vp.name, error: e.message });
    }
    await context.close();
  }
}

await browser.close();

if (issues.length) {
  console.log('\nIssues:');
  for (const i of issues) console.log(' -', JSON.stringify(i));
  process.exit(1);
}
console.log('\nAll 20 screenshots taken successfully.');
