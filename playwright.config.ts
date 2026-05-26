import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // mobile (iPhone 13 / WebKit) skipped: WebKit browser not installed in this environment.
    // Re-enable by running `npx playwright install webkit` and uncommenting the line below.
    // { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
