import { chromium } from 'playwright-core';

const baseUrl = process.env.LIFEBOOK_E2E_BASE_URL || 'http://localhost:8081';
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : { channel: 'msedge' };
const browser = await chromium.launch({ ...launchOptions, headless: true });
const page = await browser.newPage({ viewport: { width: 500, height: 1000 } });
const browserErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/delete-account`, { waitUntil: 'networkidle' });
  await page.getByText('Delete your LifeBook account', { exact: true }).waitFor();
  await page.getByText('Sign in to request deletion', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/privacy-policy`, { waitUntil: 'networkidle' });
  await page.getByText('Data practices & retention', { exact: true }).waitFor();
  await page.getByText('Private by design', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/join-family?token=family_12345.invite_12345.secret_1234567890`, { waitUntil: 'networkidle' });
  await page.getByText('Join a private family LifeBook', { exact: true }).waitFor();
  await page.getByText('Sign in to continue', { exact: true }).waitFor();

  if (browserErrors.length > 0) {
    throw new Error(`Browser reported ${browserErrors.length} error(s): ${browserErrors.join(' | ')}`);
  }
  console.log('Public privacy and invitation routes browser smoke test passed (3 routes).');
} finally {
  await browser.close();
}
