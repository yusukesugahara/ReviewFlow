function readString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isEnabledFlag(config: Record<string, unknown>, key: string): boolean {
  const raw = config[key];
  return (
    typeof raw === 'string' && (raw === '1' || raw.toLowerCase() === 'true')
  );
}

function assertProductionEnv(config: Record<string, unknown>): void {
  const jwt = readString(config, 'JWT_SECRET') ?? '';
  const apiKey = readString(config, 'INTERNAL_API_KEY') ?? '';
  const mailFrom = readString(config, 'MAIL_FROM') ?? '';
  const frontendBaseUrl = readString(config, 'FRONTEND_BASE_URL') ?? '';

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

  if (!readString(config, 'DATABASE_URL')) {
    for (const key of [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_NAME',
    ] as const) {
      if (!readString(config, key)) {
        throw new Error(
          `本番で PostgreSQL を使うときは DATABASE_URL または ${key} を設定してください。`,
        );
      }
    }
  }

  if (isEnabledFlag(config, 'MAIL_ENABLED')) {
    const provider = (
      readString(config, 'MAIL_PROVIDER') ?? 'smtp'
    ).toLowerCase();
    if (provider === 'gmail') {
      if (
        !readString(config, 'MAIL_GMAIL_USER') &&
        !readString(config, 'GMAIL_USER')
      ) {
        throw new Error(
          '本番で Gmail を使うときは MAIL_GMAIL_USER または GMAIL_USER を設定してください。',
        );
      }
      if (
        !readString(config, 'MAIL_GMAIL_APP_PASSWORD') &&
        !readString(config, 'GMAIL_APP_PASSWORD')
      ) {
        throw new Error(
          '本番で Gmail を使うときは MAIL_GMAIL_APP_PASSWORD または GMAIL_APP_PASSWORD を設定してください。',
        );
      }
    } else if (provider === 'smtp') {
      if (!readString(config, 'MAIL_SMTP_HOST')) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_HOST を設定してください。',
        );
      }
      if (!readString(config, 'MAIL_SMTP_USER')) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_USER を設定してください。',
        );
      }
      if (!readString(config, 'MAIL_SMTP_PASSWORD')) {
        throw new Error(
          '本番で SMTP を使うときは MAIL_SMTP_PASSWORD を設定してください。',
        );
      }
    }
  }
}

/** ConfigModule.forRoot の validate に渡す */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.NODE_ENV === 'production') {
    assertProductionEnv(config);
  }
  return config;
}
