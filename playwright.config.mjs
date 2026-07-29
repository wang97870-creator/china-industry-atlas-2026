import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/v21.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "docs/qa/playwright-report", open: "never" }]],
  outputDir: "docs/qa/test-results",
  use: {
    baseURL: "http://127.0.0.1:4175",
    headless: true,
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN",
    launchOptions: existsSync(localChrome) ? { executablePath: localChrome } : {},
  },
  webServer: {
    command: "python3 -m http.server 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
