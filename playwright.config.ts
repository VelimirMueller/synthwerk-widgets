import { defineConfig, devices } from '@playwright/test'

const PORT = 4174

// One browser (CI-E2E-02). The fleet runs this stage on workflow_dispatch only (CI-E2E-01).
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['junit', { outputFile: 'e2e-junit.xml' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'pnpm build && node tests/e2e/serve.ts',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) }
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // New headless Chromium: the headless shell has no camera capture (NotSupportedError).
        // `playwright install chromium` (local and the fleet e2e stage) installs both builds.
        channel: 'chromium',
        // A fake camera (a test pattern) for the vision widget. Permission stays per test.
        launchOptions: { args: ['--use-fake-device-for-media-stream'] }
      }
    }
  ]
})
