# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/frontend/e2e/space-user-management.spec.ts >> スペースユーザ管理 >> 最後のスペース管理者はスペースユーザに変更できない
- Location: apps/frontend/e2e/space-user-management.spec.ts:17:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/space", waiting until "load"

```

# Test source

```ts
  1  | import { expect, type APIRequestContext, type Page } from "@playwright/test";
  2  | import { getE2eEnv } from "../../src/lib/e2e-env";
  3  | 
  4  | export const DEMO_ADMIN_EMAIL = "admin@reviewflow.demo";
  5  | export const DEMO_PASSWORD = "Password123!";
  6  | 
  7  | export type DemoSpaceSummary = {
  8  |   id: string;
  9  |   name: string;
  10 | };
  11 | 
  12 | export async function loginAsDemoUser(
  13 |   page: Page,
  14 |   email = DEMO_ADMIN_EMAIL,
  15 | ): Promise<string> {
  16 |   const token = await getDemoAccessToken(page.request, email);
  17 |   await page.context().addCookies([
  18 |     {
  19 |       name: "access_token",
  20 |       value: token,
  21 |       url: getPlaywrightBaseUrl(),
  22 |       httpOnly: true,
  23 |       sameSite: "Lax",
  24 |     },
  25 |   ]);
> 26 |   await page.goto("/space");
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  27 |   await expect(page).toHaveURL(/\/(?:admin\/spaces|space)(?:\?.*)?$/);
  28 |   return token;
  29 | }
  30 | 
  31 | export async function getDemoAccessToken(
  32 |   request: APIRequestContext,
  33 |   email = DEMO_ADMIN_EMAIL,
  34 | ): Promise<string> {
  35 |   const { apiBase, internalApiKey } = getE2eEnv();
  36 |   const response = await request.post(`${apiBase}/auth/login`, {
  37 |     headers: { "X-API-Key": internalApiKey },
  38 |     data: { email, password: DEMO_PASSWORD },
  39 |   });
  40 |   if (!response.ok()) {
  41 |     throw new Error(`demo login failed: ${response.status()} ${await response.text()}`);
  42 |   }
  43 |   const body = (await response.json()) as { data?: { access_token?: string } };
  44 |   const token = body.data?.access_token;
  45 |   if (!token) {
  46 |     throw new Error("demo login response did not include access_token");
  47 |   }
  48 |   return token;
  49 | }
  50 | 
  51 | export async function getDemoSpaces(
  52 |   request: APIRequestContext,
  53 |   accessToken: string,
  54 | ): Promise<Map<string, DemoSpaceSummary>> {
  55 |   const { apiBase, internalApiKey } = getE2eEnv();
  56 |   const response = await request.get(`${apiBase}/groups`, {
  57 |     headers: {
  58 |       Authorization: `Bearer ${accessToken}`,
  59 |       "X-API-Key": internalApiKey,
  60 |     },
  61 |   });
  62 |   if (!response.ok()) {
  63 |     throw new Error(`groups fetch failed: ${response.status()} ${await response.text()}`);
  64 |   }
  65 |   const body = (await response.json()) as { data?: { groups?: DemoSpaceSummary[] } };
  66 |   const spaces = body.data?.groups ?? [];
  67 |   return new Map(spaces.map((space) => [space.name, space]));
  68 | }
  69 | 
  70 | function getPlaywrightBaseUrl(): string {
  71 |   return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
  72 | }
  73 | 
```