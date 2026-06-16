import "server-only";

import { z } from "zod";
import { getClientEnv } from "@/lib/env";

/**
 * Server Action / RSC から Nest へ `fetch` するときのベース URL。
 * Docker 等で `NEXT_PUBLIC_API_URL` がブラウザ向けの場合は `INTERNAL_API_ORIGIN` を使う。
 */
export function getServerApiBaseUrl(): string {
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

/**
 * サーバー側の認証関連環境変数を検証して取得します。
 */
export function getServerAuthEnv(): ServerAuthEnv {
  const parsed = serverAuthEnvSchema.parse({
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    NEXT_PUBLIC_API_URL: getClientEnv().NEXT_PUBLIC_API_URL,
  });
  return {
    ...parsed,
    apiBaseUrl: getServerApiBaseUrl(),
  };
}
