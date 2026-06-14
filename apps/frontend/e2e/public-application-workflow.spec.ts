import { expect, test, type APIRequestContext } from "@playwright/test";
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
  submitPublicApplicationViaUi,
} from "./helpers/public-application";
import { getE2eEnv } from "../src/lib/e2e-env";

type ApplicationDetail = {
  id: string;
  status: string;
  values?: Record<string, unknown>;
};

type CorrectionTargets = {
  applicationStatus: string;
  openCorrection: {
    items?: Array<{
      fieldKey: string;
      currentValue: unknown;
    }>;
  } | null;
};

type AuditLog = {
  actionType: string;
  actorType: string;
  actorEmailSnapshot: string | null;
  applicationId: string | null;
  statusFrom: string | null;
  statusTo: string | null;
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

    const { application } = await submitPublicApplicationViaUi({
      applicantEmail,
      page,
      request,
      session,
      setup,
      space,
      value: applicationValue,
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

  test("公開フォームの申請を差し戻し、修正再提出後に承認できる", async ({
    page,
    request,
  }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "correction-flow",
        spaceName: uniqueE2eLabel("差し戻し確認スペース"),
      },
    );
    const setup = await createPublishedFormSetup(request, session, space);
    const applicantEmail = `${uniqueE2eLabel("correction-applicant")}@example.com`;
    const originalValue = uniqueE2eLabel("修正前の内容");
    const fixedValue = uniqueE2eLabel("修正後の内容");
    const overallComment = "E2E 差し戻し全体コメント";
    const fieldComment = "E2E 項目コメント";

    const { application } = await submitPublicApplicationViaUi({
      applicantEmail,
      page,
      request,
      session,
      setup,
      space,
      value: originalValue,
    });
    expect(application.status).toBe("in_review");

    await page.goto(`/space/${space.id}/submissions/${application.id}`);
    await page.getByLabel("差し戻し全体コメント（任意）").fill(overallComment);
    await page.getByLabel("この項目を差し戻し対象にする").check();
    await page
      .getByPlaceholder("この項目への差し戻しコメント（任意）")
      .fill(fieldComment);
    await page.getByRole("button", { name: "選択した項目を差し戻す" }).click();
    const returnDialog = page.getByRole("dialog", {
      name: "選択した項目を差し戻しますか",
    });
    await expect(returnDialog).toBeVisible();
    await returnDialog.getByRole("button", { name: "差し戻す" }).click();

    await expect(page.getByText("申請を差し戻しました")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("差し戻し").first()).toBeVisible();

    const returned = await getApplication(request, session, application.id);
    expect(returned.status).toBe("returned");
    const returnedTargets = await getCorrectionTargets(
      request,
      session,
      application.id,
    );
    expect(returnedTargets.applicationStatus).toBe("returned");
    expect(returnedTargets.openCorrection?.items?.[0]).toMatchObject({
      fieldKey: setup.fieldKey,
      currentValue: originalValue,
    });

    await setApplicantAccessTokenCookie(page.context(), {
      applicationId: application.id,
      email: applicantEmail,
      formDefinitionId: setup.definitionId,
      groupId: space.id,
      tenantId: session.user.tenantId,
    });

    await page.goto("/apply/correction");
    await expect(
      page.getByRole("heading", { name: setup.formName }),
    ).toBeVisible();
    await expect(page.getByText(overallComment)).toBeVisible();
    await expect(page.getByText(fieldComment)).toBeVisible();
    const correctionInput = page.locator(`input[name="field:${setup.fieldKey}"]`);
    await expect(correctionInput).toHaveValue(originalValue);
    await correctionInput.fill(fixedValue);
    await page.getByRole("button", { name: "修正して再提出" }).click();
    const correctionDialog = page.getByRole("dialog", {
      name: "修正内容の確認",
    });
    await expect(correctionDialog.getByText(fixedValue)).toBeVisible();
    await correctionDialog.getByRole("button", { name: "再提出する" }).click();

    await expect(
      page.getByRole("heading", { name: "再提出しました" }),
    ).toBeVisible({ timeout: 15_000 });

    const resubmitted = await getApplication(request, session, application.id);
    expect(resubmitted.status).toBe("in_review");
    expect(resubmitted.values?.[setup.fieldKey]).toBe(fixedValue);
    const resolvedTargets = await getCorrectionTargets(
      request,
      session,
      application.id,
    );
    expect(resolvedTargets.openCorrection).toBeNull();

    await page.goto(`/space/${space.id}/submissions/${application.id}`);
    await expect(page.getByText(fixedValue).first()).toBeVisible();
    await page.getByRole("button", { name: "承認する" }).click();
    const approveDialog = page.getByRole("dialog", {
      name: "申請を承認しますか",
    });
    await approveDialog.getByRole("button", { name: "承認する" }).click();

    await expect(page.getByText("申請を承認しました")).toBeVisible({
      timeout: 15_000,
    });
    const approved = await getApplication(request, session, application.id);
    expect(approved.status).toBe("approved");

    const auditLogs = await listApplicationAuditLogs(
      request,
      session,
      application.id,
    );
    expect(auditLogs.map((log) => log.actionType)).toEqual(
      expect.arrayContaining([
        "application.returned",
        "application.corrected",
        "application.resubmitted",
        "application.approved",
      ]),
    );
    expect(findAuditLog(auditLogs, "application.returned")).toMatchObject({
      actorType: "user",
      applicationId: application.id,
      statusFrom: "in_review",
      statusTo: "returned",
    });
    expect(findAuditLog(auditLogs, "application.corrected")).toMatchObject({
      actorType: "applicant",
      actorEmailSnapshot: applicantEmail,
      applicationId: application.id,
      statusFrom: "returned",
      statusTo: "returned",
    });
    expect(findAuditLog(auditLogs, "application.resubmitted")).toMatchObject({
      actorType: "applicant",
      actorEmailSnapshot: applicantEmail,
      applicationId: application.id,
      statusFrom: "returned",
      statusTo: "in_review",
    });
    expect(findAuditLog(auditLogs, "application.approved")).toMatchObject({
      actorType: "user",
      applicationId: application.id,
      statusFrom: "in_review",
      statusTo: "approved",
    });
  });

  test("公開フォームの申請を却下できる", async ({ page, request }) => {
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "reject-flow",
        spaceName: uniqueE2eLabel("却下確認スペース"),
      },
    );
    const setup = await createPublishedFormSetup(request, session, space);
    const applicantEmail = `${uniqueE2eLabel("reject-applicant")}@example.com`;
    const applicationValue = uniqueE2eLabel("却下対象の内容");

    const { application } = await submitPublicApplicationViaUi({
      applicantEmail,
      page,
      request,
      session,
      setup,
      space,
      value: applicationValue,
    });
    expect(application.status).toBe("in_review");

    await page.goto(`/space/${space.id}/submissions/${application.id}`);
    await expect(page.getByText(applicationValue).first()).toBeVisible();
    await page.getByRole("button", { name: "却下する" }).click();
    const rejectDialog = page.getByRole("dialog", {
      name: "申請を却下しますか",
    });
    await rejectDialog.getByLabel("コメント（任意）").fill("E2E 却下理由");
    await rejectDialog.getByRole("button", { name: "却下する" }).click();

    await expect(page.getByText("申請を却下しました")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("却下").first()).toBeVisible();

    const rejected = await getApplication(request, session, application.id);
    expect(rejected.status).toBe("rejected");

    const auditLogs = await listApplicationAuditLogs(
      request,
      session,
      application.id,
    );
    expect(findAuditLog(auditLogs, "application.rejected")).toMatchObject({
      actorType: "user",
      applicationId: application.id,
      statusFrom: "in_review",
      statusTo: "rejected",
    });
  });
});

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

async function getCorrectionTargets(
  request: APIRequestContext,
  session: E2eSession,
  applicationId: string,
): Promise<CorrectionTargets> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<CorrectionTargets>(
    await request.get(`${apiBase}/applications/${applicationId}/correction-targets`, {
      headers: authHeaders(session.accessToken),
    }),
    "get application correction targets",
  );
}

async function listApplicationAuditLogs(
  request: APIRequestContext,
  session: E2eSession,
  applicationId: string,
): Promise<AuditLog[]> {
  const { apiBase } = getE2eEnv();
  const body = await unwrapApiData<{ logs?: AuditLog[] }>(
    await request.get(`${apiBase}/audit-logs`, {
      headers: authHeaders(session.accessToken),
      params: { applicationId, limit: 20 },
    }),
    "list application audit logs",
  );
  return body.logs ?? [];
}

function findAuditLog(logs: AuditLog[], actionType: string): AuditLog {
  const log = logs.find((item) => item.actionType === actionType);
  expect(log, `${actionType} audit log was not found`).toBeTruthy();
  return log as AuditLog;
}
