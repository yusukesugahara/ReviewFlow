describe("env helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // テスト内容: エンドツーエンドテストの既定値と設定済み通信先の末尾スラッシュ除去を確認する
  it("returns e2e defaults and trims configured API URL", async () => {
    delete process.env.E2E_API_URL;
    delete process.env.E2E_INTERNAL_API_KEY;
    const { getE2eEnv } = await import("@/lib/env");

    expect(getE2eEnv()).toEqual({
      apiBase: "http://127.0.0.1:3000",
      internalApiKey: "dev-internal-key-change-me",
    });

    process.env.E2E_API_URL = "http://backend.local/";
    process.env.E2E_INTERNAL_API_KEY = "secret";

    expect(getE2eEnv()).toEqual({
      apiBase: "http://backend.local",
      internalApiKey: "secret",
    });
  });

  // テスト内容: ブラウザテスト設定値が既定値と環境変数から返ることを確認する
  it("returns Playwright config values from defaults and environment", async () => {
    process.env.CI = "1";
    process.env.PLAYWRIGHT_SKIP_WEBSERVER = "1";
    process.env.PLAYWRIGHT_BASE_URL = "http://frontend.local";
    process.env.E2E_API_URL = "http://backend.local/";
    process.env.E2E_INTERNAL_API_KEY = "secret";
    const { getPlaywrightConfigEnv } = await import("@/lib/env");

    expect(getPlaywrightConfigEnv()).toEqual({
      baseURL: "http://frontend.local",
      e2eApiUrl: "http://backend.local",
      e2eApiKey: "secret",
      ci: true,
      skipWebServer: true,
    });
  });
});
