/**
 * 起動前に検証する（ConfigModule より前なので process.env を直接参照する）。
 *
 * .env: NODE_ENV, INTERNAL_API_KEY, JWT_SECRET, JWT_EXPIRES_IN, DB_PATH,
 * MAIL_ENABLED, MAIL_PROVIDER, MAIL_FROM, MAIL_REPLY_TO, FRONTEND_BASE_URL,
 * MAIL_GMAIL_USER, MAIL_GMAIL_APP_PASSWORD, GMAIL_USER, GMAIL_APP_PASSWORD,
 * MAIL_SMTP_HOST, MAIL_SMTP_PORT, MAIL_SMTP_SECURE, MAIL_SMTP_USER,
 * MAIL_SMTP_PASSWORD
 */
export function assertProductionEnvFromProcess(): void {
  // 共通シークレット・必須値
  const jwt = process.env.JWT_SECRET ?? '';
  const apiKey = process.env.INTERNAL_API_KEY ?? '';
  const mailFrom = process.env.MAIL_FROM ?? '';
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL ?? '';

  if (jwt.length < 32) {
    throw new Error(
      '本番では JWT_SECRET を 32 文字以上のランダム文字列に設定してください。',
    );
  }
  if (apiKey.length < 16) {
    throw new Error(
      '本番では INTERNAL_API_KEY を 16 文字以上に設定してください。',
    );
  }
  if (!mailFrom.length) {
    throw new Error('本番では MAIL_FROM を設定してください。');
  }
  if (!frontendBaseUrl.length) {
    throw new Error('本番では FRONTEND_BASE_URL を設定してください。');
  }

  // データベース必須変数(DB_PATH or MySQL系は DATABASE_URL/個別指定)
  const driver = (process.env.DB_DRIVER ?? 'sqlite').toLowerCase();
  if (driver === 'mysql' || driver === 'mariadb') {
    // MySQL利用時はURLか各種個別設定必須
    if (!process.env.DATABASE_URL?.length) {
      for (const key of [
        'DB_HOST',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_NAME',
      ] as const) {
        if (!process.env[key]?.length) {
          throw new Error(
            `本番で MySQL を使うときは DATABASE_URL または ${key} を設定してください。`,
          );
        }
      }
    }
  } else if (driver === 'sqlite') {
    // SQLite (DB_PATH必須)
    if (!(process.env.DB_PATH ?? '').length) {
      throw new Error('本番では DB_PATH (SQLite) を設定してください。');
    }
  }

  // メール送信: 有効時のみプロバイダごとに必須値あり
  const mailEnabled =
    process.env.MAIL_ENABLED === '1' || process.env.MAIL_ENABLED === 'true';
  if (mailEnabled) {
    const provider = (process.env.MAIL_PROVIDER ?? 'smtp').toLowerCase();
    if (provider === 'gmail') {
      if (
        !(process.env.MAIL_GMAIL_USER ?? process.env.GMAIL_USER ?? '').length
      ) {
        throw new Error(
          '本番で Gmail を使うときは MAIL_GMAIL_USER または GMAIL_USER を設定してください。',
        );
      }
      if (
        !(
          process.env.MAIL_GMAIL_APP_PASSWORD ??
          process.env.GMAIL_APP_PASSWORD ??
          ''
        ).length
      ) {
        throw new Error(
          '本番で Gmail を使うときは MAIL_GMAIL_APP_PASSWORD または GMAIL_APP_PASSWORD を設定してください。',
        );
      }
    } else if (provider === 'smtp') {
      // SMTP用
      if (!(process.env.MAIL_SMTP_HOST ?? '').length) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_HOST を設定してください。',
        );
      }
      if (!(process.env.MAIL_SMTP_USER ?? '').length) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_USER を設定してください。',
        );
      }
      if (!(process.env.MAIL_SMTP_PASSWORD ?? '').length) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_PASSWORD を設定してください。',
        );
      }
      // ポート・SECUREは型変換等でバリデーションするなら追加（現状省略）
    }
    // MAIL_REPLY_TO は推奨だが必須としない
  }
}
