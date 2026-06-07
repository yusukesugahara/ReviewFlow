import "server-only";

import { z } from "zod";
import type {
  AuthLoginSuccessJson,
  AuthMeSuccessJson,
  AuthRegisterSuccessJson,
} from "@/lib/schema";

const authIssueTokensSuccessSchema = z.object({
  status: z.union([z.literal(200), z.literal(201)]),
  data: z.object({
    access_token: z.string(),
  }),
});

const authMeSuccessSchema = z.object({
  status: z.literal(200),
  data: z.object({
    id: z.string(),
    email: z.string(),
    tenantId: z.string(),
    roles: z.array(z.string()),
  }),
});

export function parseAuthLoginSuccess(
  json: unknown,
): AuthLoginSuccessJson | null {
  const result = authIssueTokensSuccessSchema.safeParse(json);
  return result.success ? (result.data as AuthLoginSuccessJson) : null;
}

export function parseAuthRegisterSuccess(
  json: unknown,
): AuthRegisterSuccessJson | null {
  const result = authIssueTokensSuccessSchema.safeParse(json);
  return result.success ? (result.data as AuthRegisterSuccessJson) : null;
}

export function parseAuthMeSuccess(json: unknown): AuthMeSuccessJson | null {
  const result = authMeSuccessSchema.safeParse(json);
  return result.success ? (result.data as AuthMeSuccessJson) : null;
}
