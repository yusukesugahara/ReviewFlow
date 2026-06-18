import "server-only";

import { throwApiFailure, type ApiResponseLike } from "./api-failure";

export type ApiSuccessEnvelope<T> = {
  status: number;
  data: T;
};

/**
 * API レスポンスエンベロープから data を取り出します。
 */
function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }

  return (raw as ApiSuccessEnvelope<T>).data;
}

/**
 * backend API client のレスポンスから成功時の data を取り出します。
 */
export function unwrapResponseData<T>(response: ApiResponseLike): T {
  if (
    !response.response.ok ||
    response.data === undefined ||
    response.data === null
  ) {
    throwApiFailure(response);
  }

  return unwrapData<T>(response.data);
}
