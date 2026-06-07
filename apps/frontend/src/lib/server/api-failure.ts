import "server-only";

import { z } from "zod";

export type ApiFailure = {
  status: number;
  body?: unknown;
};

const apiFailureSchema = z.object({
  status: z.number(),
  body: z.unknown().optional(),
});

const apiErrorBodySchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

export function isApiFailure(error: unknown): error is ApiFailure {
  return apiFailureSchema.safeParse(error).success;
}

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

export function throwIfApiResponseFailed(response: {
  response: Response;
  error?: unknown;
}): void {
  if (!response.response.ok) {
    throw { status: response.response.status, body: response.error };
  }
}
