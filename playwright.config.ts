import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: /capture-demo\.spec\.ts/,
  timeout: 60_000,
  use: {
    viewport: { width: 1280, height: 720 },
    video: "on",
  },
  outputDir: "test-results",
  webServer: {
    command: "npx vite preview --port 4174 --strictPort",
    url: "http://localhost:4174/langtons-ant/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
