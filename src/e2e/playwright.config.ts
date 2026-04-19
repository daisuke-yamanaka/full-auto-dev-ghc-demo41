import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:5177',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
  },
  webServer: [
    {
      command: 'cd ../backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev -Dserver.port=8082 -q',
      url: 'http://localhost:8082/api/books',
      reuseExistingServer: true,
      timeout: 180000,
    },
    {
      command: 'cd ../frontend && npm run dev -- --port 5177',
      url: 'http://localhost:5177',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
