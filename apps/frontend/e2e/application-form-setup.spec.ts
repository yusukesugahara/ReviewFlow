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

type FormField = {
  fieldKey: string;
  label: string;
  placeholder: string | null;
};

type FormDefinition = {
  id: string;
  name: string;
  fields: FormField[];
};

type ApplicationDetail = {
  formDefinitionId: string | null;
  status: string;
};

type PublishedSetup = {
  applicationId: string;
  definitionId: string;
};

test.describe("申請フォーム設定", () => {
  test("公開済みフォームの編集でフォーム名と項目が保存される", async ({
    page,
    request,
  }) => {
    const initialName = uniqueE2eLabel("初期申請フォーム");
    const initialFieldLabel = "初期項目";
    const updatedName = uniqueE2eLabel("更新後申請フォーム");
    const updatedFieldLabel = uniqueE2eLabel("更新後項目");
    const updatedPlaceholder = "更新後の入力例";
    const { session, space } = await prepareTenantSpace(
      page.context(),
      request,
      {
        emailPrefix: "form-setup",
        spaceName: uniqueE2eLabel("フォーム編集スペース"),
      },
    );
    const setup = await createPublishedSetup(request, session, space, {
      fieldLabel: initialFieldLabel,
      formName: initialName,
    });

    await page.goto(
      `/space/${space.id}/applications/${setup.applicationId}/edit?definitionId=${setup.definitionId}`,
    );
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "申請フォーム" }),
    ).toBeVisible();

    await page.getByLabel("申請フォーム名").fill(updatedName);
    const fieldEditButton = page.getByRole("button", {
      name: `${initialFieldLabel}を編集`,
    });
    await expect(fieldEditButton).toBeVisible();
    await fieldEditButton.hover();
    await fieldEditButton.click();
    const fieldDialog = page.getByRole("dialog", { name: "フォーム項目を編集" });
    await expect(fieldDialog).toBeVisible();
    await fieldDialog.getByLabel("項目名").fill(updatedFieldLabel);
    await fieldDialog.getByLabel("入力例").fill(updatedPlaceholder);
    await fieldDialog.getByRole("button", { name: "反映して閉じる" }).click();
    await expect(fieldDialog).toBeHidden();

    await page.getByRole("button", { name: "公開" }).click();
    await expect(page.getByRole("heading", { name: "フォーム詳細" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: updatedName })).toBeVisible();
    const updatedFieldInput = page.getByRole("textbox", {
      name: `${updatedFieldLabel}*`,
    });
    await expect(updatedFieldInput).toBeVisible();
    await expect(updatedFieldInput).toHaveAttribute(
      "placeholder",
      updatedPlaceholder,
    );

    const application = await getApplication(
      request,
      session,
      setup.applicationId,
    );
    expect(application.status).toBe("published");
    expect(application.formDefinitionId).toBeTruthy();
    expect(application.formDefinitionId).not.toBe(setup.definitionId);

    const definition = await getFormDefinition(
      request,
      session,
      application.formDefinitionId ?? "",
    );
    expect(definition.name).toBe(updatedName);
    expect(definition.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: updatedFieldLabel,
          placeholder: updatedPlaceholder,
        }),
      ]),
    );
  });
});

async function createPublishedSetup(
  request: APIRequestContext,
  session: E2eSession,
  space: E2eSpace,
  input: {
    fieldLabel: string;
    formName: string;
  },
): Promise<PublishedSetup> {
  const { apiBase } = getE2eEnv();
  const headers = authHeaders(session.accessToken);
  const definition = await unwrapApiData<{ id: string }>(
    await request.post(`${apiBase}/form-definitions`, {
      headers,
      data: {
        groupId: space.id,
        name: input.formName,
        description: `${input.formName} の説明`,
      },
    }),
    "create form definition",
  );
  await unwrapApiData<unknown>(
    await request.post(`${apiBase}/form-definitions/${definition.id}/fields`, {
      headers,
      data: {
        fieldKey: "initial_field",
        label: input.fieldLabel,
        fieldType: "text",
        required: true,
        placeholder: "初期入力例",
        helpText: "初期説明",
        sortOrder: 0,
      },
    }),
    "create form field",
  );
  await unwrapApiData<unknown>(
    await request.post(`${apiBase}/form-definitions/${definition.id}/publish`, {
      headers,
    }),
    "publish form definition",
  );
  const flow = await unwrapApiData<{ id: string }>(
    await request.post(`${apiBase}/approval-flows`, {
      headers,
      data: {
        groupId: space.id,
        name: `${input.formName} 承認フロー`,
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
    "create approval flow",
  );
  const application = await unwrapApiData<{ id: string }>(
    await request.post(`${apiBase}/applications`, {
      headers,
      data: {
        groupId: space.id,
        formDefinitionId: definition.id,
        approvalFlowId: flow.id,
        status: "published",
        values: {},
      },
    }),
    "create setup application",
  );

  return {
    applicationId: application.id,
    definitionId: definition.id,
  };
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
    "get application",
  );
}

async function getFormDefinition(
  request: APIRequestContext,
  session: E2eSession,
  definitionId: string,
): Promise<FormDefinition> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<FormDefinition>(
    await request.get(`${apiBase}/form-definitions/${definitionId}`, {
      headers: authHeaders(session.accessToken),
    }),
    "get form definition",
  );
}
