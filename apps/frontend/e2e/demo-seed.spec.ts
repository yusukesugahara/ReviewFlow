import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { getE2eEnv } from "../src/lib/e2e-env";

const DEMO_PASSWORD = "Password123!";

type SpaceSummary = {
  id: string;
  name: string;
};

async function login(page: Page, email: string) {
  const token = await getAccessToken(page.request, email);
  await page.context().addCookies([
    {
      name: "access_token",
      value: token,
      url: "http://127.0.0.1:3001",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/space");
  await expect(page).toHaveURL(/\/(?:admin\/spaces|space)(?:\?.*)?$/);
}

async function getAccessToken(request: APIRequestContext, email: string) {
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

async function getDemoSpaces(request: APIRequestContext) {
  const { apiBase, internalApiKey } = getE2eEnv();
  const token = await getAccessToken(request, "admin@reviewflow.demo");
  const response = await request.get(`${apiBase}/groups`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-API-Key": internalApiKey,
    },
  });
  if (!response.ok()) {
    throw new Error(`groups fetch failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { data?: { groups?: SpaceSummary[] } };
  const spaces = body.data?.groups ?? [];
  return new Map(spaces.map((space) => [space.name, space]));
}

test.describe("デモseedデータ表示", () => {
  test("市民課と道路公園課の申請一覧に通常申請データが表示される", async ({
    page,
    request,
  }) => {
    const spaces = await getDemoSpaces(request);
    await login(page, "admin@reviewflow.demo");

    const expected = [
      {
        spaceName: "市民課",
        applicants: ["sato@example.com", "yamada@example.com", "kato@example.com"],
        forms: ["住民票写し交付申請", "マイナンバーカード窓口予約"],
      },
      {
        spaceName: "道路公園課",
        applicants: [
          "green-setsubi@example.com",
          "koji@example.com",
          "sakura-clean@example.com",
        ],
        forms: ["道路占用許可申請", "公園利用届"],
      },
    ];

    for (const item of expected) {
      const space = spaces.get(item.spaceName);
      expect(space, `${item.spaceName} がseedされていません`).toBeTruthy();

      await page.goto(`/space/${encodeURIComponent(space!.id)}/submissions`);
      await expect(page.getByRole("heading", { name: "すべての申請" })).toBeVisible();
      await expect(page.getByText("申請はまだありません")).toHaveCount(0);
      await expect(page.getByText("全5件")).toBeVisible();

      for (const form of item.forms) {
        await expect(page.getByRole("cell", { name: form }).first()).toBeVisible();
      }
      for (const applicant of item.applicants) {
        await expect(page.getByText(applicant)).toBeVisible();
      }
      for (const status of ["提出済み", "レビュー中", "差し戻し", "承認", "却下"]) {
        await expect(page.getByText(status).first()).toBeVisible();
      }
    }
  });

  test("各スペースの所属ユーザは職員4人で表示される", async ({
    page,
    request,
  }) => {
    const spaces = await getDemoSpaces(request);
    await login(page, "admin@reviewflow.demo");

    const expected = [
      {
        spaceName: "市民課",
        users: [
          "admin@reviewflow.demo",
          "citizen-reviewer@reviewflow.demo",
          "citizen-approver@reviewflow.demo",
          "citizen-operator@reviewflow.demo",
        ],
      },
      {
        spaceName: "道路公園課",
        users: [
          "admin@reviewflow.demo",
          "road-reviewer@reviewflow.demo",
          "road-approver@reviewflow.demo",
          "road-inspector@reviewflow.demo",
        ],
      },
    ];

    for (const item of expected) {
      const space = spaces.get(item.spaceName);
      expect(space, `${item.spaceName} がseedされていません`).toBeTruthy();

      await page.goto(`/space/users?spaceId=${encodeURIComponent(space!.id)}`);
      for (const email of item.users) {
        await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();
      }
    }
  });
});
