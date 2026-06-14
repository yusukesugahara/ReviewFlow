import { expect, test, type APIRequestContext } from "@playwright/test";
import { getE2eEnv } from "../src/lib/e2e-env";
import {
  authHeaders,
  prepareTenantSpace,
  setApplicantAccessTokenCookie,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
} from "./helpers/auth";
import {
  createPublishedFormSetup,
  findSubmittedApplication,
} from "./helpers/public-application";

type ApplicationDetail = {
  status: string;
  values?: Record<string, unknown>;
};

test.describe("公開申請フォームのフィールド種別", () => {
  test("主要な入力種別を送信して保存できる", async ({ page, request }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "field-types",
        spaceName: uniqueE2eLabel("項目種別確認スペース"),
      },
    );
    const setup = await createPublishedFormSetup(request, session, space, {
      formNamePrefix: "項目種別確認フォーム",
      fields: [
        {
          fieldKey: "details",
          fieldType: "textarea",
          label: "詳細",
          required: true,
          placeholder: "詳細を入力",
        },
        {
          fieldKey: "amount",
          fieldType: "number",
          label: "金額",
          required: true,
          placeholder: "0",
        },
        {
          fieldKey: "target_date",
          fieldType: "date",
          label: "対象日",
          required: true,
        },
        {
          fieldKey: "category",
          fieldType: "select",
          label: "カテゴリ",
          required: true,
          options: [
            { label: "交通費", value: "transport" },
            { label: "備品", value: "supplies" },
          ],
        },
        {
          fieldKey: "priority",
          fieldType: "radio",
          label: "優先度",
          required: true,
          options: [
            { label: "通常", value: "normal" },
            { label: "至急", value: "urgent" },
          ],
        },
        {
          fieldKey: "channels",
          fieldType: "checkbox",
          label: "連絡方法",
          required: true,
          options: [
            { label: "メール", value: "email" },
            { label: "チャット", value: "chat" },
          ],
        },
        {
          fieldKey: "confirmed",
          fieldType: "consent",
          label: "内容を確認しました",
          required: true,
        },
      ],
    });
    const applicantEmail = `${uniqueE2eLabel("field-applicant")}@example.com`;
    const details = `複数行の申請内容\n${uniqueE2eLabel("detail")}`;
    const targetDate = currentMonthDateValue(15);

    await setApplicantAccessTokenCookie(page.context(), {
      email: applicantEmail,
      formDefinitionId: setup.definitionId,
      groupId: space.id,
      tenantId: session.user.tenantId,
    });

    await page.goto("/apply/form");
    await expect(
      page.getByRole("heading", { name: setup.formName }),
    ).toBeVisible();
    await page.getByLabel("詳細*").fill(details);
    await page.locator('input[name="field:amount"]').fill("12000");
    await page.locator('[id="field:category"]').click();
    await page.getByRole("option", { name: "備品" }).click();
    await page.getByLabel("至急").check();
    await page.getByLabel("メール").check();
    await page.getByLabel("チャット").check();
    await page.locator('input[name="field:confirmed"]').check();
    await page.getByRole("button", { name: "日付を選択" }).click();
    await page.getByRole("button", { name: "15" }).click();

    await page.getByRole("button", { name: "申請を送信" }).click();
    const submitDialog = page.getByRole("dialog", {
      name: "申請内容の確認",
    });
    await expect(submitDialog.getByText(details)).toBeVisible();
    await expect(submitDialog.getByText("備品")).toBeVisible();
    await expect(submitDialog.getByText("至急")).toBeVisible();
    await expect(submitDialog.getByText("メール, チャット")).toBeVisible();
    await expect(submitDialog.getByText("同意済み")).toBeVisible();
    await submitDialog.getByRole("button", { name: "申請する" }).click();

    await expect(
      page.getByRole("heading", { name: "申請を送信しました" }),
    ).toBeVisible({ timeout: 15_000 });

    const application = await findSubmittedApplication(request, session, {
      applicantEmail,
      formDefinitionId: setup.definitionId,
      spaceId: space.id,
    });
    const detail = await getApplication(request, session, application.id);
    expect(detail.status).toBe("in_review");
    expect(detail.values).toMatchObject({
      amount: 12000,
      category: "supplies",
      channels: ["email", "chat"],
      confirmed: true,
      target_date: targetDate,
      priority: "urgent",
    });
    expect(String(detail.values?.details).replace(/\r\n/g, "\n")).toBe(details);
  });
});

function currentMonthDateValue(day: number): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

async function getApplication(
  request: APIRequestContext,
  session: E2eSession,
  applicationId: string,
): Promise<ApplicationDetail> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<ApplicationDetail>(
    await request.get(`${apiBase}/applications/${applicationId}`, {
      headers: authHeaders(session.accessToken),
    }),
    "get field type application",
  );
}
