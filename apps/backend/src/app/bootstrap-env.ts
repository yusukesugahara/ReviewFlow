/**
 * 起動前に検証する（ConfigModule より前なので process.env を直接参照する）。
 */
export function assertProductionEnvFromProcess(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const jwt = process.env.JWT_SECRET ?? '';
  const apiKey = process.env.INTERNAL_API_KEY ?? '';
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
  if (!(process.env.MAIL_FROM ?? '').length) {
    throw new Error('本番では MAIL_FROM を設定してください。');
  }
  if (!(process.env.FRONTEND_BASE_URL ?? '').length) {
    throw new Error('本番では FRONTEND_BASE_URL を設定してください。');
  }

  const driver = (process.env.DB_DRIVER ?? 'sqlite').toLowerCase();
  const useMysql = driver === 'mysql' || driver === 'mariadb';
  if (useMysql && !process.env.DATABASE_URL?.length) {
    for (const key of [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_NAME',
    ] as const) {
      if (!process.env[key]?.length) {
        throw new Error(
          `本番で MySQL を使うときは DATABASE_URL、または ${key} を設定してください。`,
        );
      }
    }
  }

  const provider = (process.env.MAIL_PROVIDER ?? 'smtp').toLowerCase();
  if (provider === 'gmail') {
    for (const key of ['MAIL_GMAIL_USER', 'MAIL_GMAIL_APP_PASSWORD'] as const) {
      if (!process.env[key]?.length) {
        throw new Error(`本番で Gmail を使うときは ${key} を設定してください。`);
      }
    }
    return;
  }

  for (const key of [
    'MAIL_SMTP_HOST',
    'MAIL_SMTP_USER',
    'MAIL_SMTP_PASSWORD',
  ] as const) {
    if (!process.env[key]?.length) {
      throw new Error(`本番で SMTP を使うときは ${key} を設定してください。`);
    }
  }
}
