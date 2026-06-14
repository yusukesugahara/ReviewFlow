import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { prepareTenantSpace, uniqueE2eLabel } from "./helpers/auth";
import { getE2eEnv } from "../src/lib/e2e-env";

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

  test("メールアドレス変更は確認URLを開くまで反映しない", async ({
    page,
    request,
  }) => {
    const { session } = await prepareTenantSpace(page.context(), request, {
      emailPrefix: "account-email",
      spaceName: uniqueE2eLabel("メール変更確認スペース"),
    });
    const requestedEmail = `${uniqueE2eLabel("requested-email")}@example.com`;

    await page.goto("/account");
    const main = page.getByRole("main");
    await expect(main.getByText(session.user.email)).toBeVisible();

    await openAccountAction(page, "メールアドレスを編集");
    const emailDialog = page.getByRole("dialog", {
      name: "メールアドレスを編集",
    });
    await emailDialog.getByLabel("メールアドレス").fill(requestedEmail);
    await emailDialog
      .getByRole("button", { name: "確認メールを送信" })
      .click();

    await expect(
      page.getByText(
        "確認メールを送信しました。メール内のURLから変更を確定してください",
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText(session.user.email)).toBeVisible();
    await expect(main.getByText(requestedEmail)).toHaveCount(0);

    await expectLogin(request, session.user.email, session.password, true);
    await expectLogin(request, requestedEmail, session.password, false);
  });

  test("パスワード変更後は新しいパスワードでログインできる", async ({
    page,
    request,
  }) => {
    const { session } = await prepareTenantSpace(page.context(), request, {
      emailPrefix: "account-password",
      spaceName: uniqueE2eLabel("パスワード変更確認スペース"),
    });
    const newPassword = `new-password-${Date.now()}`;

    await page.goto("/account");
    await openAccountAction(page, "パスワードを変更");
    const passwordDialog = page.getByRole("dialog", {
      name: "パスワードを変更",
    });
    await passwordDialog
      .getByLabel("現在のパスワード")
      .fill(session.password);
    await passwordDialog
      .getByLabel("新しいパスワード", { exact: true })
      .fill(newPassword);
    await passwordDialog
      .getByLabel("新しいパスワード（確認）")
      .fill(newPassword);
    await passwordDialog.getByRole("button", { name: "変更" }).click();

    await expect(page.getByText("パスワードを変更しました")).toBeVisible({
      timeout: 15_000,
    });

    await expectLogin(request, session.user.email, session.password, false);
    await expectLogin(request, session.user.email, newPassword, true);
  });
});

async function openAccountAction(
  page: Page,
  actionName: string,
): Promise<void> {
  await page.getByRole("button", { name: "アカウント操作" }).click();
  await page.getByRole("menuitem", { name: actionName }).click();
}

async function expectLogin(
  request: APIRequestContext,
  email: string,
  password: string,
  succeeds: boolean,
): Promise<void> {
  const { apiBase, internalApiKey } = getE2eEnv();
  const response = await request.post(`${apiBase}/auth/login`, {
    headers: { "X-API-Key": internalApiKey },
    data: { email, password },
  });
  expect(
    response.ok(),
    `${email} login expected ${succeeds ? "success" : "failure"}, got ${
      response.status()
    } ${await response.text()}`,
  ).toBe(succeeds);
}
