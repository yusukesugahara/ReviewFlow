import type { DynamicFormField } from "@/components/applications/dynamic-fields";

export type ApiFailure = { status: number; body: unknown };

export function isApiFailure(error: unknown): error is ApiFailure {
  return !!error && typeof error === "object" && typeof (error as ApiFailure).status === "number";
}

export function errorMessageFromBody(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "submit_failed";
}

export function isDynamicFormField(value: unknown): value is DynamicFormField {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.fieldKey === "string" &&
    typeof row.label === "string" &&
    typeof row.fieldType === "string"
  );
}
