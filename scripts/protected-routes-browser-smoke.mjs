import { chromium } from 'playwright-core';

const baseUrl = process.env.LIFEBOOK_E2E_BASE_URL || 'http://localhost:8081';
const protectedRoutes = ['/chapters', '/chapter', '/edit-chapter', '/reminders', '/reminder', '/edit-reminder'];
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
  for (const route of protectedRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await page.waitForURL(`${baseUrl}/`);
    await page.getByText('Remember your people. Keep your shared history.', { exact: true }).waitFor();
  }

  if (browserErrors.length > 0) {
    throw new Error(`Browser reported ${browserErrors.length} error(s): ${browserErrors.join(' | ')}`);
  }

  console.log(`Protected routes browser smoke test passed (${protectedRoutes.length} routes).`);
} finally {
  await browser.close();
}
