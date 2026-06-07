import "server-only";

export type ApiFailure = {
  status: number;
  body?: unknown;
};

export function isApiFailure(error: unknown): error is ApiFailure {
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as { status?: unknown }).status === "number"
  );
}

export function errorMessageFromBody(
  body: unknown,
  fallback = "unknown_error",
): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    if (Array.isArray(message)) {
      return message
        .filter((item): item is string => typeof item === "string")
        .join(", ");
    }
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
