import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 15000
  }
});
