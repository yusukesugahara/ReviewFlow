import { z } from "zod";

/**
 * フロント（Next / Playwright / e2e）で使う環境変数は、値の読み取りをこのファイルに集約する。
 *
 * | 変数名 | 用途 |
 * |--------|------|
 * | `NODE_ENV` | development / production / test（`nodeEnv` / `isProduction`） |
 * | `NEXT_PUBLIC_API_URL` | ブラウザ・Server Action から参照する API オリジン |
 * | `INTERNAL_API_KEY` | サーバー専用（Nest へ `X-API-Key`） |
 * | `INTERNAL_API_ORIGIN` | サーバー専用（Docker 等で `NEXT_PUBLIC_API_URL` がブラウザ向けのとき、Server Action から Nest へ届けるオリジン。未設定時は `NEXT_PUBLIC_API_URL`） |
 * | `PLAYWRIGHT_BASE_URL` | Playwright の `baseURL`（既定: http://127.0.0.1:3001） |
 * | `E2E_API_URL` | e2e 用バックエンド URL（既定: http://127.0.0.1:3000） |
 * | `E2E_INTERNAL_API_KEY` | e2e 用 API キー（既定: dev-internal-key-change-me） |
 * | `PLAYWRIGHT_SKIP_WEBSERVER` | セット時は Playwright が Next を起動しない |
 * | `CI` | Playwright の forbidOnly / retries 等 |
 */

// --- NODE_ENV ---

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

/** `openapi-fetch` 等向け */
export const env = {
  get NEXT_PUBLIC_API_URL() {
    return getClientEnv().NEXT_PUBLIC_API_URL;
  },
};

// --- サーバー専用 ---

/** Server Action / RSC から Nest へ `fetch` するときのベース URL（Docker 内はサービス名など） */
export function getServerApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    throw new Error("getServerApiBaseUrl はサーバー専用です");
  }
  const fromInternal = process.env.INTERNAL_API_ORIGIN?.replace(/\/$/, "");
  if (fromInternal) {
    return fromInternal;
  }
  return getClientEnv().NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

const serverAuthEnvSchema = z.object({
  INTERNAL_API_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().min(1),
});

export type ServerAuthEnv = z.infer<typeof serverAuthEnvSchema> & {
  apiBaseUrl: string;
};

export function getServerAuthEnv(): ServerAuthEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerAuthEnv はサーバー専用です");
  }
  const parsed = serverAuthEnvSchema.parse({
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    NEXT_PUBLIC_API_URL: getClientEnv().NEXT_PUBLIC_API_URL,
  });
  return {
    ...parsed,
    apiBaseUrl: getServerApiBaseUrl(),
  };
}

// --- Playwright / e2e（親プロセス用。getClientEnv は呼ばない）---

const E2E_DEFAULTS = {
  API_URL: "http://127.0.0.1:3000",
  INTERNAL_API_KEY: "dev-internal-key-change-me",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3001",
} as const;

export function getE2eEnv() {
  return {
    apiBase:
      process.env.E2E_API_URL?.replace(/\/$/, "") ?? E2E_DEFAULTS.API_URL,
    internalApiKey:
      process.env.E2E_INTERNAL_API_KEY ?? E2E_DEFAULTS.INTERNAL_API_KEY,
  };
}

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
export function getInheritedProcessEnv(): NodeJS.ProcessEnv {
  return process.env;
}
