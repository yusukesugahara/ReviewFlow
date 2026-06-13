import { expect, test, type Page } from "@playwright/test";
import { prepareTenantSpace, uniqueE2eLabel } from "./helpers/auth";

test.describe("アカウント詳細", () => {
  test("アクションメニューからプロフィール・メール・パスワードのモーダルを開ける", async ({
    page,
    request,
  }) => {
    const { session } = await prepareTenantSpace(page.context(), request, {
      emailPrefix: "account",
      spaceName: uniqueE2eLabel("アカウント確認スペース"),
    });
    const updatedName = uniqueE2eLabel("テストユーザ");

    await page.goto("/account");
    const main = page.getByRole("main");
    await expect(
      page.getByRole("heading", { name: "アカウント詳細" }),
    ).toBeVisible();
    await expect(main.getByText(session.user.email)).toBeVisible();
    await expect(main.getByText("設定済み")).toBeVisible();

    await page.getByRole("button", { name: "アカウント操作" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(page.getByRole("menu")).toBeHidden();

    await openAccountAction(page, "プロフィールを編集");
    const profileDialog = page.getByRole("dialog", {
      name: "プロフィールを編集",
    });
    await profileDialog.getByLabel("名前").fill(updatedName);
    await profileDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("プロフィールを更新しました")).toBeVisible({
      timeout: 15_000,
    });
    await expect(main.getByText(updatedName)).toBeVisible();

    await openAccountAction(page, "メールアドレスを編集");
    const emailDialog = page.getByRole("dialog", {
      name: "メールアドレスを編集",
    });
    await expect(emailDialog).toBeVisible();
    await expect(
      emailDialog.getByText("URLを開くまで変更は確定しません。"),
    ).toBeVisible();
    await expect(emailDialog.getByLabel("メールアドレス")).toHaveValue(
      session.user.email,
    );
    await page.mouse.click(8, 8);
    await expect(emailDialog).toBeHidden();

    await openAccountAction(page, "パスワードを変更");
    const passwordDialog = page.getByRole("dialog", {
      name: "パスワードを変更",
    });
    await expect(passwordDialog.getByLabel("現在のパスワード")).toBeVisible();
    await expect(
      passwordDialog.getByLabel("新しいパスワード", { exact: true }),
    ).toBeVisible();
    await expect(
      passwordDialog.getByLabel("新しいパスワード（確認）"),
    ).toBeVisible();
    await passwordDialog.getByRole("button", { name: "キャンセル" }).click();
    await expect(passwordDialog).toBeHidden();
  });
});

async function openAccountAction(
  page: Page,
  actionName: string,
): Promise<void> {
  await page.getByRole("button", { name: "アカウント操作" }).click();
  await page.getByRole("menuitem", { name: actionName }).click();
}
