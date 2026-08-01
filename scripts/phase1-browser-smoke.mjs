import { chromium } from 'playwright-core';

const email = process.env.LIFEBOOK_E2E_EMAIL;
const password = process.env.LIFEBOOK_E2E_PASSWORD;
const baseUrl = process.env.LIFEBOOK_E2E_BASE_URL || 'http://localhost:8081';

if (!email || !password) {
  throw new Error('Set LIFEBOOK_E2E_EMAIL and LIFEBOOK_E2E_PASSWORD to a completed development parent account.');
}

const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : { channel: 'msedge' };
const browser = await chromium.launch({ ...launchOptions, headless: true });
const page = await browser.newPage({ viewport: { width: 500, height: 1000 } });
const browserErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') {
    browserErrors.push(message.text());
  }
});
page.on('pageerror', (error) => browserErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded' });
  const inputs = page.locator('input');
  await inputs.nth(0).fill(email);
  await inputs.nth(1).fill(password);
  await page.getByText('Sign in securely', { exact: false }).click();
  await page.waitForURL('**/home');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/home');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(`${baseUrl}/`);

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(`${baseUrl}/`);

  if (browserErrors.length > 0) {
    throw new Error(`Browser reported ${browserErrors.length} error(s).`);
  }

  console.log('Phase 1 browser smoke test passed.');
} finally {
  await browser.close();
}
