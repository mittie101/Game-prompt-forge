const { test, expect } = require('@playwright/test');
const path = require('path');
const electron = require('electron');

// This test launches the Electron app and checks main renderer content.
// It requires Playwright and browsers to be installed (playwright install) and
// should be run with the Playwright test runner (npm run test:e2e).

test('main window shows Ready status', async () => {
  // Launch Electron app via Playwright's electron API
  const electronApp = await test._electron.launch({
    executablePath: electron,
    args: [path.resolve('.')]
  });

  const window = await electronApp.firstWindow();
  // Wait for status element
  const status = await window.locator('#status');
  await expect(status).toHaveText(/Ready/);

  await electronApp.close();
});
