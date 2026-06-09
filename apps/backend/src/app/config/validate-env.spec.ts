import { validateEnv } from './validate-env';

const validProductionEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'prod-jwt-secret-at-least-32-characters-long',
  INTERNAL_API_KEY: 'prod-internal-api-key',
  MAIL_FROM: 'noreply@example.com',
  FRONTEND_BASE_URL: 'https://review.example.com',
  DATABASE_URL: 'postgres://app:app@db.example.com:5432/app',
  MAIL_ENABLED: '0',
};

describe('validateEnv', () => {
  // テスト内容: 本番必須の環境変数が不足している場合に起動前検証で落ちることを確認する
  it('throws when production secrets are missing', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      '本番では JWT_SECRET を 32 文字以上のランダム文字列に設定してください。',
    );
  });

  // テスト内容: 本番で必要なDB接続情報が揃っていれば検証を通過することを確認する
  it('accepts valid production environment variables', () => {
    expect(validateEnv(validProductionEnv)).toBe(validProductionEnv);
  });

  // テスト内容: 本番メール送信を有効にした場合にSMTP設定不足を検出できることを確認する
  it('requires SMTP settings when production mail is enabled', () => {
    expect(() =>
      validateEnv({
        ...validProductionEnv,
        MAIL_ENABLED: '1',
        MAIL_PROVIDER: 'smtp',
      }),
    ).toThrow('本番で SMTP を使うときは MAIL_SMTP_HOST を設定してください。');
  });
});
