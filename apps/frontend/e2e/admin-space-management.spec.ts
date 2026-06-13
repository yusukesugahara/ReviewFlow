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

type AuditLogList = {
  logs: Array<{
    actionType: string;
    groupId: string | null;
    metadataJson: Record<string, unknown> | null;
    summary: string | null;
    targetId: string | null;
    targetEmailSnapshot: string | null;
    targetType: string;
  }>;
  total: number;
};

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

    const auditLogs = await listSpaceAuditLogs(request, session, space.id);
    expect(auditLogs.total).toBeGreaterThanOrEqual(1);
    expect(auditLogs.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "space.updated",
          groupId: space.id,
          targetId: space.id,
          targetType: "space",
        }),
      ]),
    );
    const updateLog = auditLogs.logs.find(
      (log) =>
        log.actionType === "space.updated" && log.targetId === space.id,
    );
    expect(updateLog?.summary).toContain(updatedName);
    expect(updateLog?.metadataJson).toMatchObject({
      descriptionFrom: initialDescription,
      descriptionTo: updatedDescription,
      nameFrom: initialName,
      nameTo: updatedName,
    });
  });

  test("スペース詳細のメンバー追加ダイアログから招待を送信できる", async ({
    page,
    request,
  }) => {
    const spaceName = uniqueE2eLabel("スペース招待確認");
    const spaceDescription = "スペース招待確認用の説明文";
    const inviteeEmail = `${uniqueE2eLabel("space-invitee")}@example.com`;
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "space-invite",
        spaceDescription,
        spaceName,
      },
    );

    await page.goto("/admin/spaces");
    await page
      .getByRole("button", { name: `${spaceName} の詳細を開く` })
      .click();
    await expect(
      page.getByRole("heading", { name: "メンバー管理" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "メンバーを追加または招待" }).click();
    const dialog = page.getByRole("dialog", { name: "メンバーを追加" });
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "メンバーを追加または招待" }).click();
    const reopenedDialog = page.getByRole("dialog", {
      name: "メンバーを追加",
    });
    await reopenedDialog.getByLabel("メール").fill(inviteeEmail);
    await reopenedDialog.getByRole("button", { name: "招待" }).click();

    await expect(page.getByText("招待メールを送信しました")).toBeVisible({
      timeout: 15_000,
    });

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
          groupId: space.id,
          targetEmailSnapshot: inviteeEmail,
          targetType: "invitation",
        }),
      ]),
    );
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
    "list space invitation audit logs",
  );
}

async function listSpaceAuditLogs(
  request: APIRequestContext,
  session: E2eSession,
  spaceId: string,
): Promise<AuditLogList> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<AuditLogList>(
    await request.get(`${apiBase}/audit-logs`, {
      headers: authHeaders(session.accessToken),
      params: {
        groupId: spaceId,
        targetType: "space",
      },
    }),
    "list space audit logs",
  );
}
