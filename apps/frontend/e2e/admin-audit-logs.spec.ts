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

const AUDIT_LOG_PAGE_SIZE = 50;

test.describe("テナント管理の監査ログ", () => {
  test("監査ログ一覧をページネーションで移動できる", async ({
    page,
    request,
  }) => {
    const auditPrefix = uniqueE2eLabel("audit-page");
    const { session, space } = await prepareTenantSpace(page.context(), request, {
      emailPrefix: "audit-admin",
      spaceName: `${auditPrefix}-initial`,
    });
    await createSpaceAuditLogs(request, session, space.id, auditPrefix);

    await page.goto(
      `/admin/audit-logs?targetType=space&q=${encodeURIComponent(auditPrefix)}`,
    );
    await expect(
      page.getByRole("heading", { name: "操作履歴" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `1-${AUDIT_LOG_PAGE_SIZE}件を表示 / 全${AUDIT_LOG_PAGE_SIZE + 1}件`,
      ),
    ).toBeVisible();
    await expect(page.getByText("1 / 2")).toBeVisible();

    await page.getByRole("link", { name: "次へ" }).click();
    await expect(page).toHaveURL(/\/admin\/audit-logs\?.*page=2/);
    await expect(
      page.getByText(
        `${AUDIT_LOG_PAGE_SIZE + 1}-${AUDIT_LOG_PAGE_SIZE + 1}件を表示 / 全${
          AUDIT_LOG_PAGE_SIZE + 1
        }件`,
      ),
    ).toBeVisible();
    await expect(page.getByText("2 / 2")).toBeVisible();
    await expect(page.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await page.getByRole("link", { name: "前へ" }).click();
    await expect(page).toHaveURL(/\/admin\/audit-logs\?(?!.*page=2)/);
    await expect(page.getByText("1 / 2")).toBeVisible();
  });
});

async function createSpaceAuditLogs(
  request: APIRequestContext,
  session: E2eSession,
  spaceId: string,
  auditPrefix: string,
): Promise<void> {
  const additionalLogCount = AUDIT_LOG_PAGE_SIZE;
  for (let index = 0; index < additionalLogCount; index += 1) {
    await updateSpace(request, session, spaceId, {
      name: `${auditPrefix}-${String(index + 1).padStart(2, "0")}`,
      description: `監査ログページング確認 ${index + 1}`,
    });
  }
}

async function updateSpace(
  request: APIRequestContext,
  session: E2eSession,
  spaceId: string,
  input: {
    description: string;
    name: string;
  },
): Promise<void> {
  const { apiBase } = getE2eEnv();
  await unwrapApiData<E2eSpace>(
    await request.patch(`${apiBase}/groups/${spaceId}`, {
      headers: authHeaders(session.accessToken),
      data: input,
    }),
    "update audit space",
  );
}
