const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.spec.cjs',
  projects: [
    { name: 'iPhone-Chromium', use: { ...require('@playwright/test').devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'iPhone-WebKit', use: { ...require('@playwright/test').devices['iPhone 13'], browserName: 'webkit' } }
  ],
  timeout: 30000,
  // Les tests qui ne passent qu'au second essai sont marqués « flaky » et
  // --fail-on-flaky-tests les fait échouer au lieu de masquer l'instabilité.
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 20000
  }
});
