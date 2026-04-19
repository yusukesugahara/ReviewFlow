import { defineConfig, devices } from "@playwright/test";
import {
  getInheritedProcessEnv,
  getPlaywrightConfigEnv,
} from "./src/lib/env";

const p = getPlaywrightConfigEnv();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: p.ci,
  retries: p.ci ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: p.baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: p.skipWebServer
    ? undefined
    : {
        command: "npm run build && npx next start --port 3001",
        url: p.baseURL,
        reuseExistingServer: !p.ci,
        cwd: __dirname,
        timeout: 120_000,
        env: {
          ...getInheritedProcessEnv(),
          NODE_ENV: "production",
          NEXT_PUBLIC_API_URL: p.e2eApiUrl,
          INTERNAL_API_KEY: p.e2eApiKey,
        },
      },
});
