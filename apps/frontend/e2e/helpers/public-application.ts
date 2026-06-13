import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { getE2eEnv } from "../../src/lib/e2e-env";
import {
  authHeaders,
  setApplicantAccessTokenCookie,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
  type E2eSpace,
} from "./auth";

export type PublishedFormSetup = {
  definitionId: string;
  fields: PublishedFormFieldSetup[];
  fieldKey: string;
  fieldLabel: string;
  formName: string;
};

export type PublishedFormFieldInput = {
  fieldKey: string;
  fieldType: string;
  label: string;
  required: boolean;
  helpText?: string;
  options?: unknown[];
  placeholder?: string;
  sortOrder?: number;
};

export type PublishedFormFieldSetup = PublishedFormFieldInput & {
  sortOrder: number;
};

export type ApplicationSummary = {
  applicantEmail: string;
  formDefinitionId: string;
  id: string;
  status: string;
};

type SubmittedPublicApplication = {
  application: ApplicationSummary;
};

export async function submitPublicApplicationViaUi({
  applicantEmail,
  page,
  request,
  session,
  setup,
  space,
  value,
}: {
  applicantEmail: string;
  page: Page;
  request: APIRequestContext;
  session: E2eSession;
  setup: PublishedFormSetup;
  space: E2eSpace;
  value: string;
}): Promise<SubmittedPublicApplication> {
  await setApplicantAccessTokenCookie(page.context(), {
    email: applicantEmail,
    formDefinitionId: setup.definitionId,
    groupId: space.id,
    tenantId: session.user.tenantId,
  });

  await page.goto("/apply/form");
  await expect(page.getByRole("heading", { name: setup.formName })).toBeVisible();
  await page.getByLabel(`${setup.fieldLabel}*`).fill(value);
  await page.getByRole("button", { name: "申請を送信" }).click();

  const submitDialog = page.getByRole("dialog", {
    name: "申請内容の確認",
  });
  await expect(submitDialog).toBeVisible();
  await expect(submitDialog.getByText(value)).toBeVisible();
  await submitDialog.getByRole("button", { name: "申請する" }).click();

  await expect(
    page.getByRole("heading", { name: "申請を送信しました" }),
  ).toBeVisible({ timeout: 15_000 });

  const application = await findSubmittedApplication(request, session, {
    applicantEmail,
    formDefinitionId: setup.definitionId,
    spaceId: space.id,
  });

  return { application };
}

export async function createPublishedFormSetup(
  request: APIRequestContext,
  session: E2eSession,
  space: E2eSpace,
  options: {
    fields?: PublishedFormFieldInput[];
    formNamePrefix?: string;
  } = {},
): Promise<PublishedFormSetup> {
  const { apiBase } = getE2eEnv();
  const headers = authHeaders(session.accessToken);
  const formName = uniqueE2eLabel(options.formNamePrefix ?? "公開申請フォーム");
  const fields = buildPublishedFormFields(options.fields);
  const primaryField = fields[0];
  if (!primaryField) {
    throw new Error("Published form setup requires at least one field");
  }
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
  for (const field of fields) {
    await unwrapApiData<unknown>(
      await request.post(`${apiBase}/form-definitions/${definition.id}/fields`, {
        headers,
        data: field,
      }),
      `create public form field ${field.fieldKey}`,
    );
  }
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
    fields,
    fieldKey: primaryField.fieldKey,
    fieldLabel: primaryField.label,
    formName,
  };
}

function buildPublishedFormFields(
  fields?: PublishedFormFieldInput[],
): PublishedFormFieldSetup[] {
  if (fields?.length) {
    return fields.map((field, index) => ({
      ...field,
      sortOrder: field.sortOrder ?? index,
    }));
  }

  return [
    {
      fieldKey: "request_detail",
      fieldType: "text",
      label: uniqueE2eLabel("申請項目"),
      required: true,
      placeholder: "申請内容を入力",
      helpText: "申請内容を入力してください",
      sortOrder: 0,
    },
  ];
}

export async function findSubmittedApplication(
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
