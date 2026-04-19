import { test, expect } from "@playwright/test";
import { getE2eEnv } from "../src/lib/env";

const COOKIE_NAME = "access_token";

test.describe("ログイン後の access_token クッキー", () => {
  test("HttpOnly の access_token が付与され、document.cookie からは見えない", async ({
    page,
    request,
  }) => {
    const { apiBase, internalApiKey: apiKey } = getE2eEnv();
    const email = `e2e-${Date.now()}@example.com`;
    const password = "password12";

    const reg = await request.post(`${apiBase}/auth/register`, {
      headers: { "X-API-Key": apiKey },
      data: { email, password },
    });
    if (!reg.ok()) {
      throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });

    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === COOKIE_NAME);
    expect(tokenCookie, "access_token クッキーが無い").toBeTruthy();
    expect(tokenCookie?.httpOnly).toBe(true);

    const docCookie = await page.evaluate(() => document.cookie);
    expect(docCookie).not.toContain(COOKIE_NAME);
  });
});
