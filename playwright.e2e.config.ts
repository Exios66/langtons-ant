import { defineConfig } from "@playwright/test";

/** End-to-end UI tests against the production build. Run with `npm run test:e2e`. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4175",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    // Optional: point at an already-installed Chromium instead of `npx playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  outputDir: "test-results/e2e",
  webServer: {
    command: "npx vite preview --port 4175 --strictPort",
    url: "http://localhost:4175/langtons-ant/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
