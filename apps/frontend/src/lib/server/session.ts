import "server-only";

import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { isProduction } from "@/lib/env";

const FALLBACK_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
}

function maxAgeSecondsFromJwt(accessToken: string): number {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return FALLBACK_MAX_AGE_SEC;
    }
    const payloadB64 = parts[1];
    if (payloadB64 === undefined) {
      return FALLBACK_MAX_AGE_SEC;
    }
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp !== "number") {
      return FALLBACK_MAX_AGE_SEC;
    }
    return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return FALLBACK_MAX_AGE_SEC;
  }
}

export async function persistAccessTokenCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: maxAgeSecondsFromJwt(accessToken),
  });
}
