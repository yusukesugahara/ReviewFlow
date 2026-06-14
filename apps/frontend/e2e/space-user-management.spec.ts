import { expect, test, type APIRequestContext } from "@playwright/test";
import { getE2eEnv } from "../src/lib/e2e-env";
import { unwrapApiData } from "./helpers/auth";
import {
  DEMO_ADMIN_EMAIL,
  getDemoSpaces,
  loginAsDemoUser,
} from "./helpers/demo";

type SpaceMember = {
  email: string;
  role: string;
  userId: string;
};

test.describe("スペースユーザ管理", () => {
  test("最後のスペース管理者はスペースユーザに変更できない", async ({
    page,
    request,
  }) => {
    const accessToken = await loginAsDemoUser(page);
    const spaces = await getDemoSpaces(request, accessToken);
    const space = spaces.get("市民課");
    expect(space, "市民課がseedされていません").toBeTruthy();

    await page.goto(`/space/users?spaceId=${space!.id}`);
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "スペースユーザ一覧" }),
    ).toBeVisible();
    await expect(main.getByText(DEMO_ADMIN_EMAIL)).toBeVisible();
    await expect(main.getByText("スペース管理者")).toBeVisible();

    await page
      .getByRole("button", { name: `${DEMO_ADMIN_EMAIL} の操作` })
      .click();
    const actionMenu = page.getByRole("menu");
    await expect(actionMenu).toBeVisible();
    await expect(
      actionMenu.getByRole("menuitem", { name: "削除" }),
    ).toBeHidden();
    await actionMenu
      .getByRole("menuitem", { name: "スペースロールを変更" })
      .click();

    const roleDialog = page.getByRole("dialog", {
      name: "スペースロールを変更",
    });
    await expect(roleDialog).toBeVisible();
    await roleDialog.locator("#space-role").click();
    await page.getByRole("option", { name: "スペースユーザ" }).click();
    await roleDialog.getByRole("button", { name: "保存" }).click();

    await expect(
      page.getByText("最後のスペース管理者は変更または削除できません"),
    ).toBeVisible({ timeout: 15_000 });

    const members = await listSpaceMembers(request, accessToken, space!.id);
    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: DEMO_ADMIN_EMAIL,
          role: "admin",
        }),
      ]),
    );
  });
});

async function listSpaceMembers(
  request: APIRequestContext,
  accessToken: string,
  spaceId: string,
): Promise<SpaceMember[]> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const body = await unwrapApiData<{ members: SpaceMember[] }>(
    await request.get(`${apiBase}/groups/${spaceId}/members`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-API-Key": internalApiKey,
      },
    }),
    "list space members",
  );
  return body.members;
}
