import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  ],
  // Si BASE_URL apunta a un servidor ya levantado no se arranca nada.
  // En caso contrario se levanta la API compilada (requiere PostgreSQL disponible).
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node dist/main.js',
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 90_000,
        env: { OTEL_SDK_DISABLED: 'true', PORT: '3000' },
      },
});
