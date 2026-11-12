import { chromium } from 'playwright-core';

const cookie = process.argv[2];
const url = process.argv[3] || 'http://localhost:4321/admin';
const output = process.argv[4] || '/tmp/admin-wide.png';
const width = parseInt(process.argv[5] || '1920');
const height = parseInt(process.argv[6] || '1080');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

const context = await browser.newContext({
  viewport: { width, height },
});

const [name, value] = cookie.split('=', 2);
await context.addCookies([{
  name: name.trim(), value: value.trim(),
  domain: 'localhost', path: '/',
  httpOnly: true, secure: false, sameSite: 'Strict',
}]);

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
await page.screenshot({ path: output, fullPage: false });
console.log(`Screenshot saved to ${output} (${width}x${height})`);

await browser.close();
