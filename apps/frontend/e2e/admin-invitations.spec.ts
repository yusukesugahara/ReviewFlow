import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  authHeaders,
  prepareTenantSpace,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
} from "./helpers/auth";
import { getE2eEnv } from "../src/lib/e2e-env";

type AuditLogList = {
  logs: Array<{
    actionType: string;
    targetEmailSnapshot: string | null;
    targetType: string;
  }>;
  total: number;
};

test.describe("テナント管理のユーザ招待", () => {
  test("招待モーダルを外側クリックで閉じ、招待を送信して監査ログに残せる", async ({
    page,
    request,
  }) => {
    const { session } = await prepareTenantSpace(page.context(), request, {
      emailPrefix: "invite-admin",
      spaceName: uniqueE2eLabel("招待確認スペース"),
    });
    const inviteeEmail = `${uniqueE2eLabel("invitee")}@example.com`;

    await page.goto("/admin/invitations");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "ユーザ一覧" }),
    ).toBeVisible();
    await expect(main.getByText(session.user.email)).toBeVisible();

    await page.getByRole("button", { name: "ユーザを招待" }).click();
    const dialog = page.getByRole("dialog", { name: "新しい招待を送信" });
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "ユーザを招待" }).click();
    const reopenedDialog = page.getByRole("dialog", {
      name: "新しい招待を送信",
    });
    await reopenedDialog.getByLabel("メールアドレス").fill(inviteeEmail);
    await reopenedDialog.getByRole("button", { name: "招待メールを送信" }).click();

    await expect(
      page.getByRole("heading", { name: "招待メールを送信しました" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(inviteeEmail)).toBeVisible();

    const auditLogs = await listInvitationAuditLogs(
      request,
      session,
      inviteeEmail,
    );
    expect(auditLogs.total).toBeGreaterThanOrEqual(1);
    expect(auditLogs.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "invitation.created",
          targetEmailSnapshot: inviteeEmail,
          targetType: "invitation",
        }),
      ]),
    );
  });
});

async function listInvitationAuditLogs(
  request: APIRequestContext,
  session: E2eSession,
  inviteeEmail: string,
): Promise<AuditLogList> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<AuditLogList>(
    await request.get(`${apiBase}/audit-logs`, {
      headers: authHeaders(session.accessToken),
      params: {
        targetType: "invitation",
        q: inviteeEmail,
      },
    }),
    "list invitation audit logs",
  );
}
