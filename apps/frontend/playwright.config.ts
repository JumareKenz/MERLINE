import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks against a running stack (never production data):
 *   E2E_BASE_URL  frontend (default http://localhost:3100)
 *   E2E_API_URL   API      (default http://localhost:4100/api/v1)
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD  a seeded administrator
 * The fixture (a field interviewer, participant, consent and assignment) is
 * created through the API in global-setup.ts.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    launchOptions: {
      // Real MediaRecorder capture from Chromium's synthetic microphone.
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
