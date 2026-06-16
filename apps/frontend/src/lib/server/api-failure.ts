import "server-only";

import { z } from "zod";

export type ApiFailure = {
  status: number;
  body?: unknown;
};

export type ApiResponseLike = {
  response: Pick<Response, "ok" | "status">;
  data?: unknown;
  error?: unknown;
};

const apiFailureSchema = z.object({
  status: z.number(),
  body: z.unknown().optional(),
});

const apiErrorBodySchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

/**
 * unknown エラーが API 失敗オブジェクトかを判定します。
 */
export function isApiFailure(error: unknown): error is ApiFailure {
  return apiFailureSchema.safeParse(error).success;
}

/**
 * API エラー本文から表示可能なメッセージを取得します。
 */
export function errorMessageFromBody(
  body: unknown,
  fallback = "unknown_error",
): string {
  const parsed = apiErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return fallback;
  }
  const { message } = parsed.data;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  return fallback;
}

/**
 * backend-fetch の失敗レスポンスを例外用の API 失敗オブジェクトへ変換します。
 */
export function toApiFailure(response: ApiResponseLike): ApiFailure {
  return {
    status: response.response.status,
    body: response.error ?? response.data,
  };
}

/**
 * backend-fetch の失敗レスポンスを API 失敗例外として送出します。
 */
export function throwApiFailure(response: ApiResponseLike): never {
  throw toApiFailure(response);
}

/**
 * backend-fetch のレスポンスが失敗していれば API 失敗例外を送出します。
 */
export function throwIfApiResponseFailed(response: ApiResponseLike): void {
  if (!response.response.ok) {
    throwApiFailure(response);
  }
}
