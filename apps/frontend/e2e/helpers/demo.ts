import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { getE2eEnv } from "../../src/lib/e2e-env";

export const DEMO_ADMIN_EMAIL = "admin@reviewflow.demo";
export const DEMO_PASSWORD = "Password123!";

export type DemoSpaceSummary = {
  id: string;
  name: string;
};

export async function loginAsDemoUser(
  page: Page,
  email = DEMO_ADMIN_EMAIL,
): Promise<string> {
  const token = await getDemoAccessToken(page.request, email);
  await page.context().addCookies([
    {
      name: "access_token",
      value: token,
      url: getPlaywrightBaseUrl(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/space");
  await expect(page).toHaveURL(/\/(?:admin\/spaces|space)(?:\?.*)?$/);
  return token;
}

export async function getDemoAccessToken(
  request: APIRequestContext,
  email = DEMO_ADMIN_EMAIL,
): Promise<string> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const response = await request.post(`${apiBase}/auth/login`, {
    headers: { "X-API-Key": internalApiKey },
    data: { email, password: DEMO_PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`demo login failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { data?: { access_token?: string } };
  const token = body.data?.access_token;
  if (!token) {
    throw new Error("demo login response did not include access_token");
  }
  return token;
}

export async function getDemoSpaces(
  request: APIRequestContext,
  accessToken: string,
): Promise<Map<string, DemoSpaceSummary>> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const response = await request.get(`${apiBase}/groups`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-API-Key": internalApiKey,
    },
  });
  if (!response.ok()) {
    throw new Error(`groups fetch failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { data?: { groups?: DemoSpaceSummary[] } };
  const spaces = body.data?.groups ?? [];
  return new Map(spaces.map((space) => [space.name, space]));
}

function getPlaywrightBaseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
}
