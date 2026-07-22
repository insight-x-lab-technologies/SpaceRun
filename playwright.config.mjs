import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  },
  webServer: {
    command: `PLAYWRIGHT_PORT=${port} node tests/e2e/server.mjs`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile-small', use: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-landscape', use: { viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-dpr2', use: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
  ]
});
