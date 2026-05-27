import "server-only";

export type ApiSuccessEnvelope<T> = {
  status: number;
  data: T;
};

export function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }

  return (raw as ApiSuccessEnvelope<T>).data;
}
