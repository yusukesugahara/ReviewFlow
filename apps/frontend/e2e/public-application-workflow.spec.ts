import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  authHeaders,
  prepareTenantSpace,
  setApplicantAccessTokenCookie,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
  type E2eSpace,
} from "./helpers/auth";
import { getE2eEnv } from "../src/lib/e2e-env";

type PublishedFormSetup = {
  definitionId: string;
  fieldLabel: string;
  formName: string;
};

type ApplicationSummary = {
  applicantEmail: string;
  formDefinitionId: string;
  id: string;
  status: string;
};

type ApplicationDetail = {
  id: string;
  status: string;
};

test.describe("公開申請から承認まで", () => {
  test("公開フォームから申請し、申請詳細で承認できる", async ({
    page,
    request,
  }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "public-flow",
        spaceName: uniqueE2eLabel("公開申請確認スペース"),
      },
    );
    const setup = await createPublishedFormSetup(request, session, space);
    const applicantEmail = `${uniqueE2eLabel("applicant")}@example.com`;
    const applicationValue = uniqueE2eLabel("申請内容");

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
    await page.getByLabel(`${setup.fieldLabel}*`).fill(applicationValue);
    await page.getByRole("button", { name: "申請を送信" }).click();

    const submitDialog = page.getByRole("dialog", {
      name: "申請内容の確認",
    });
    await expect(submitDialog).toBeVisible();
    await expect(submitDialog.getByText(applicationValue)).toBeVisible();
    await submitDialog.getByRole("button", { name: "申請する" }).click();

    await expect(
      page.getByRole("heading", { name: "申請を送信しました" }),
    ).toBeVisible({ timeout: 15_000 });

    const application = await findSubmittedApplication(request, session, {
      applicantEmail,
      formDefinitionId: setup.definitionId,
      spaceId: space.id,
    });
    expect(application.status).toBe("in_review");

    await page.goto(`/space/${space.id}/submissions/${application.id}`);
    await expect(page.getByRole("heading", { name: "基本情報" })).toBeVisible();
    await expect(page.getByText(applicantEmail).first()).toBeVisible();
    await expect(page.getByText(applicationValue).first()).toBeVisible();
    await expect(page.getByText("レビュー中").first()).toBeVisible();

    await page.getByRole("button", { name: "承認する" }).click();
    const approveDialog = page.getByRole("dialog", {
      name: "申請を承認しますか",
    });
    await approveDialog.getByLabel("コメント（任意）").fill("E2E 承認");
    await approveDialog.getByRole("button", { name: "承認する" }).click();

    await expect(page.getByText("申請を承認しました")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("承認").first()).toBeVisible();

    const approved = await getApplication(request, session, application.id);
    expect(approved.status).toBe("approved");
  });
});

async function createPublishedFormSetup(
  request: APIRequestContext,
  session: E2eSession,
  space: E2eSpace,
): Promise<PublishedFormSetup> {
  const { apiBase } = getE2eEnv();
  const headers = authHeaders(session.accessToken);
  const formName = uniqueE2eLabel("公開申請フォーム");
  const fieldLabel = uniqueE2eLabel("申請項目");
  const definition = await unwrapApiData<{ id: string }>(
    await request.post(`${apiBase}/form-definitions`, {
      headers,
      data: {
        groupId: space.id,
        name: formName,
        description: `${formName} の説明`,
      },
    }),
    "create public form definition",
  );
  await unwrapApiData<unknown>(
    await request.post(`${apiBase}/form-definitions/${definition.id}/fields`, {
      headers,
      data: {
        fieldKey: "request_detail",
        label: fieldLabel,
        fieldType: "text",
        required: true,
        placeholder: "申請内容を入力",
        helpText: "申請内容を入力してください",
        sortOrder: 0,
      },
    }),
    "create public form field",
  );
  await unwrapApiData<unknown>(
    await request.post(`${apiBase}/form-definitions/${definition.id}/publish`, {
      headers,
    }),
    "publish public form definition",
  );
  await unwrapApiData<unknown>(
    await request.post(`${apiBase}/approval-flows`, {
      headers,
      data: {
        groupId: space.id,
        name: `${formName} 承認フロー`,
        steps: [
          {
            stepOrder: 1,
            stepName: "一次承認",
            assigneeUserId: session.user.id,
            assigneeUserIds: [session.user.id],
            canReturn: true,
          },
        ],
      },
    }),
    "create public approval flow",
  );

  return {
    definitionId: definition.id,
    fieldLabel,
    formName,
  };
}

async function findSubmittedApplication(
  request: APIRequestContext,
  session: E2eSession,
  input: {
    applicantEmail: string;
    formDefinitionId: string;
    spaceId: string;
  },
): Promise<ApplicationSummary> {
  const { apiBase } = getE2eEnv();
  const body = await unwrapApiData<{ applications?: ApplicationSummary[] }>(
    await request.get(`${apiBase}/applications`, {
      headers: authHeaders(session.accessToken),
      params: { groupId: input.spaceId },
    }),
    "list submitted applications",
  );
  const application = body.applications?.find(
    (item) =>
      item.applicantEmail === input.applicantEmail &&
      item.formDefinitionId === input.formDefinitionId,
  );
  expect(application, "submitted application was not found").toBeTruthy();
  return application as ApplicationSummary;
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
    "get submitted application",
  );
}
