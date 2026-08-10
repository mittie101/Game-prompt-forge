const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'e2e',
  timeout: 120_000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
};
