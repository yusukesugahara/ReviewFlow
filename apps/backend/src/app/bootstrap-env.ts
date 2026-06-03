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

  if (!process.env.DATABASE_URL?.length) {
    for (const key of [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_NAME',
    ] as const) {
      if (!process.env[key]?.length) {
        throw new Error(
          `本番で PostgreSQL を使うときは DATABASE_URL、または ${key} を設定してください。`,
        );
      }
    }
  }
}
