import { chromium } from 'playwright-core';
import { join } from 'path';

const DIR = process.env.WIREFRAME_DIR || join(process.cwd(), 'wireframes');
const fixes = ['01', '09', '10'];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const num of fixes) {
  const file = `aj-wireframe-${num}-${num === '01' ? 'icon-sidebar' : num === '09' ? 'compact' : 'minimal'}.html`;
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const url = `file://${join(DIR, file)}`;
    const out = join(DIR, `preview-${num}-${vp.name}.png`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`Re-shot ${vp.name} ${file}`);
    await context.close();
  }
}

await browser.close();
