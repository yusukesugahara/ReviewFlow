const E2E_DEFAULTS = {
  API_URL: "http://127.0.0.1:3000",
  INTERNAL_API_KEY: "dev-internal-key-change-me",
  JWT_SECRET: "docker-jwt-secret-at-least-32-characters-long",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3001",
} as const;

/**
 * E2E 実行時に使う環境変数を検証して取得します。
 */
export function getE2eEnv() {
  return {
    apiBase:
      process.env.E2E_API_URL?.replace(/\/$/, "") ?? E2E_DEFAULTS.API_URL,
    internalApiKey:
      process.env.E2E_INTERNAL_API_KEY ?? E2E_DEFAULTS.INTERNAL_API_KEY,
    jwtSecret: process.env.E2E_JWT_SECRET ?? E2E_DEFAULTS.JWT_SECRET,
  };
}

/**
 * Playwright 設定で使う環境変数を検証して取得します。
 */
export function getPlaywrightConfigEnv() {
  const e2eApiUrlRaw = process.env.E2E_API_URL ?? E2E_DEFAULTS.API_URL;
  const e2eApiKey =
    process.env.E2E_INTERNAL_API_KEY ?? E2E_DEFAULTS.INTERNAL_API_KEY;
  return {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? E2E_DEFAULTS.PLAYWRIGHT_BASE_URL,
    e2eApiUrl: e2eApiUrlRaw.replace(/\/$/, ""),
    e2eApiKey,
    ci: !!process.env.CI,
    skipWebServer: !!process.env.PLAYWRIGHT_SKIP_WEBSERVER,
  };
}

/** Playwright webServer が親シェルの PATH 等を引き継ぐため */
/**
 * テスト実行時に子プロセスへ引き継ぐ環境変数を組み立てます。
 */
export function getInheritedProcessEnv(): NodeJS.ProcessEnv {
  return process.env;
}
