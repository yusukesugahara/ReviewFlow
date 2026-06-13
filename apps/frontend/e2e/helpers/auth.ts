import {
  createHmac,
  randomUUID,
} from "crypto";
import {
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { getE2eEnv } from "../../src/lib/e2e-env";

export const E2E_PASSWORD = "password12";

type ApiEnvelope<T> = {
  data?: T;
};

export type E2eUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
};

export type E2eSession = {
  accessToken: string;
  password: string;
  user: E2eUser;
};

export type E2eSpace = {
  id: string;
  name: string;
  description: string | null;
};

export type E2eTenantSpace = {
  session: E2eSession;
  space: E2eSpace;
};

export type ApplicantAccessTokenInput = {
  applicationId?: string;
  email: string;
  formDefinitionId?: string;
  groupId: string;
  tenantId: string;
};

export function uniqueE2eLabel(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTenantAdmin(
  request: APIRequestContext,
  options: {
    emailPrefix?: string;
    organizationName?: string;
    password?: string;
  } = {},
): Promise<E2eSession> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const email = `${uniqueE2eLabel(options.emailPrefix ?? "e2e-admin")}@example.com`;
  const password = options.password ?? E2E_PASSWORD;
  const response = await request.post(`${apiBase}/auth/register`, {
    headers: { "X-API-Key": internalApiKey },
    data: {
      email,
      password,
      organizationName: options.organizationName ?? uniqueE2eLabel("E2E tenant"),
    },
  });

  const data = await unwrapApiData<{
    access_token: string;
    user: E2eUser;
  }>(response, "register");

  return {
    accessToken: data.access_token,
    password,
    user: data.user,
  };
}

export async function createSpace(
  request: APIRequestContext,
  session: E2eSession,
  options: {
    description?: string;
    name?: string;
  } = {},
): Promise<E2eSpace> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const response = await request.post(`${apiBase}/groups`, {
    headers: authHeaders(session.accessToken, internalApiKey),
    data: {
      name: options.name ?? uniqueE2eLabel("E2E Space"),
      description: options.description ?? "Playwright test space",
      adminUserIds: [session.user.id],
    },
  });

  return unwrapApiData<E2eSpace>(response, "create space");
}

export async function prepareTenantSpace(
  context: BrowserContext,
  request: APIRequestContext,
  options: {
    emailPrefix?: string;
    organizationName?: string;
    spaceDescription?: string;
    spaceName?: string;
  } = {},
): Promise<E2eTenantSpace> {
  const session = await createTenantAdmin(request, {
    emailPrefix: options.emailPrefix,
    organizationName: options.organizationName,
  });
  const space = await createSpace(request, session, {
    description: options.spaceDescription,
    name: options.spaceName,
  });
  await setAccessTokenCookie(context, session.accessToken);
  return { session, space };
}

export async function setAccessTokenCookie(
  context: BrowserContext,
  accessToken: string,
): Promise<void> {
  await context.addCookies([
    {
      name: "access_token",
      value: accessToken,
      url: getPlaywrightBaseUrl(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function setApplicantAccessTokenCookie(
  context: BrowserContext,
  input: ApplicantAccessTokenInput,
): Promise<string> {
  const token = createApplicantAccessToken(input);
  await context.addCookies([
    {
      name: "applicant_access_token",
      value: token,
      url: getPlaywrightBaseUrl(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return token;
}

export function authHeaders(
  accessToken: string,
  internalApiKey = getE2eEnv().internalApiKey,
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-API-Key": internalApiKey,
  };
}

export async function unwrapApiData<T>(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
  label: string,
): Promise<T> {
  expect(
    response.ok(),
    `${label} failed: ${response.status()} ${await response.text()}`,
  ).toBe(true);
  const body = (await response.json()) as ApiEnvelope<T>;
  expect(body.data, `${label} response did not include data`).toBeTruthy();
  return body.data as T;
}

function getPlaywrightBaseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
}

export function createApplicantAccessToken(
  input: ApplicantAccessTokenInput,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    kind: "applicant_access",
    tenantId: input.tenantId,
    email: input.email,
    groupId: input.groupId,
    formDefinitionId: input.formDefinitionId,
    applicationId: input.applicationId,
    iat: now,
    exp: now + 60 * 60,
  };
  return signJwt(payload, getE2eEnv().jwtSecret);
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeJwtPart(header);
  const encodedPayload = encodeJwtPart({
    ...payload,
    jti: randomUUID(),
  });
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function encodeJwtPart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
