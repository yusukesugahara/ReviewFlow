import { z } from "zod";

/**
 * ブラウザバンドルから参照できる公開環境変数。
 *
 * | 変数名 | 用途 |
 * |--------|------|
 * | `NODE_ENV` | development / production / test（`nodeEnv` / `isProduction`） |
 * | `NEXT_PUBLIC_API_URL` | ブラウザから参照する API オリジン |
 */

export type NodeEnvKind = "development" | "production" | "test";

const rawNodeEnv = process.env.NODE_ENV;

export const nodeEnv: NodeEnvKind =
  rawNodeEnv === "production"
    ? "production"
    : rawNodeEnv === "test"
      ? "test"
      : "development";

export const isProduction = nodeEnv === "production";

// --- クライアント公開（NEXT_PUBLIC_*）---

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1),
});

let clientEnvCache: z.infer<typeof publicEnvSchema> | undefined;

/**
 * ブラウザバンドル・Server Component から参照。初回アクセス時に parse する。
 * （Playwright の親プロセスだけでは import されない限り parse されない）
 */
export function getClientEnv(): z.infer<typeof publicEnvSchema> {
  if (!clientEnvCache) {
    clientEnvCache = publicEnvSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    });
  }
  return clientEnvCache;
}

/** backend API client 向け */
export const env = {
  get NEXT_PUBLIC_API_URL() {
    return getClientEnv().NEXT_PUBLIC_API_URL;
  },
};
