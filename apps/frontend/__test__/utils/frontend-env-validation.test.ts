const {
  parseEnvFile,
  validateFrontendBuildEnv,
} = require("../../scripts/validate-env.cjs") as {
  parseEnvFile: (content: string) => Record<string, string>;
  validateFrontendBuildEnv: (
    env: Record<string, string | undefined>,
  ) => string[];
};

describe("frontend build environment validation", () => {
  // テスト内容: ビルドに必須の環境変数が不足している場合に検出できることを確認する
  it("reports missing required environment variables", () => {
    expect(validateFrontendBuildEnv({})).toEqual([
      "NEXT_PUBLIC_API_URL を設定してください。",
      "INTERNAL_API_KEY を設定してください。",
    ]);
  });

  // テスト内容: URL形式とAPIキー長の不備を検出できることを確認する
  it("reports invalid configured values", () => {
    expect(
      validateFrontendBuildEnv({
        NEXT_PUBLIC_API_URL: "localhost:3000",
        INTERNAL_API_KEY: "short",
        INTERNAL_API_ORIGIN: "backend:3000",
      }),
    ).toEqual([
      "NEXT_PUBLIC_API_URL は http(s) の URL で設定してください。",
      "INTERNAL_API_KEY は 16 文字以上で設定してください。",
      "INTERNAL_API_ORIGIN は http(s) の URL で設定してください。",
    ]);
  });

  // テスト内容: 有効な環境変数と .env の基本的な解析を確認する
  it("accepts valid environment variables and parses env files", () => {
    expect(
      validateFrontendBuildEnv({
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        INTERNAL_API_KEY: "valid-internal-api-key",
        INTERNAL_API_ORIGIN: "http://backend:3000",
      }),
    ).toEqual([]);

    expect(
      parseEnvFile(`
        NEXT_PUBLIC_API_URL=https://api.example.com
        INTERNAL_API_KEY="valid-internal-api-key"
        # comment
        INTERNAL_API_ORIGIN=http://backend:3000 # inline comment
      `),
    ).toEqual({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      INTERNAL_API_KEY: "valid-internal-api-key",
      INTERNAL_API_ORIGIN: "http://backend:3000",
    });
  });
});
