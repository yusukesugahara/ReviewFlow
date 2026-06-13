import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  authHeaders,
  prepareTenantSpace,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
  type E2eSpace,
} from "./helpers/auth";
import { getE2eEnv } from "../src/lib/e2e-env";

test.describe("テナント管理のスペース管理", () => {
  test("スペース編集モーダルを外側クリックで閉じ、名前と説明文を更新できる", async ({
    page,
    request,
  }) => {
    const initialName = uniqueE2eLabel("編集前スペース");
    const initialDescription = "編集前の説明文";
    const updatedName = uniqueE2eLabel("編集後スペース");
    const updatedDescription = "編集後の説明文";
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "space-edit",
        spaceDescription: initialDescription,
        spaceName: initialName,
      },
    );

    await page.goto("/admin/spaces");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("button", {
        name: `${initialName} ${initialDescription}`,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: `${initialName}を編集` }).click();
    const dialog = page.getByRole("dialog", { name: "スペースを編集" });
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: `${initialName}を編集` }).click();
    const reopenedDialog = page.getByRole("dialog", {
      name: "スペースを編集",
    });
    await reopenedDialog.getByLabel("スペース名").fill(updatedName);
    await reopenedDialog.getByLabel("説明文").fill(updatedDescription);
    await reopenedDialog.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("スペース情報を更新しました")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      main.getByRole("button", {
        name: `${updatedName} ${updatedDescription}`,
      }),
    ).toBeVisible();

    const updatedSpace = await getSpace(request, session, space.id);
    expect(updatedSpace.name).toBe(updatedName);
    expect(updatedSpace.description).toBe(updatedDescription);
  });
});

async function getSpace(
  request: APIRequestContext,
  session: E2eSession,
  spaceId: string,
): Promise<E2eSpace> {
  const { apiBase } = getE2eEnv();
  const response = await request.get(`${apiBase}/groups`, {
    headers: authHeaders(session.accessToken),
  });
  const body = await unwrapApiData<{ groups?: E2eSpace[] }>(
    response,
    "list spaces",
  );
  const space = body.groups?.find((item) => item.id === spaceId);
  expect(space, "updated space was not found").toBeTruthy();
  return space as E2eSpace;
}
