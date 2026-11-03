import { defineConfig, devices } from '@playwright/test';
import { env, isProd, STORAGE_STATE } from './src/config/env';

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 2 : 0,
  ...(env.CI && { workers: 2 }),
  // Data-mutating tests never run against production.
  ...(isProd && { grepInvert: /@mutates/ }),
  timeout: 30_000,
  expect: {
    timeout: 7_500,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  // Baselines are OS-specific (font rendering); generate them on the CI OS (Linux) or in the Playwright Docker image.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: env.CI
    ? [['blob'], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: env.BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: '*.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Pure HTTP: uses the `apiRequest` fixture, never launches a browser.
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'e2e-chromium',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
    {
      name: 'visual-chromium',
      testDir: './tests/visual',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: 1,
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',
        storageState: STORAGE_STATE,
      },
    },
  ],
});
