import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? "3107";
const baseURL = `http://127.0.0.1:${port}`;
const next = "node ./node_modules/next/dist/bin/next";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: `${next} start --hostname 127.0.0.1 --port ${port}`,
        url: `${baseURL}/manifest.webmanifest`,
        reuseExistingServer: false,
        timeout: 120_000
      },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], browserName: "chromium" } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } }
  ]
});
