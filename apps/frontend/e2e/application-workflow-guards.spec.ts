import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { getE2eEnv } from "../src/lib/e2e-env";
import {
  authHeaders,
  createSpace,
  createTenantAdmin,
  uniqueE2eLabel,
  unwrapApiData,
  type E2eSession,
  type E2eSpace,
} from "./helpers/auth";
import {
  createPublishedFormSetup,
  type PublishedFormSetup,
} from "./helpers/public-application";

type ApplicationCreateResponse = {
  id: string;
  status: string;
};

type ApplicationDetail = {
  id: string;
  status: string;
  values?: Record<string, unknown>;
};

type ApiErrorBody = {
  errorCode?: string;
};

type FormDefinitionDetail = {
  fields?: Array<{
    fieldKey: string;
    id: string;
  }>;
};

test.describe("申請ワークフローの状態遷移ガード", () => {
  test("承認済み申請は再承認・却下・差し戻しできない", async ({
    request,
  }) => {
    const session = await createTenantAdmin(request, {
      emailPrefix: "workflow-guard",
    });
    const space = await createSpace(request, session, {
      name: uniqueE2eLabel("状態遷移ガードスペース"),
    });
    const setup = await createPublishedFormSetup(request, session, space);
    const field = await getPrimaryField(request, session, setup);
    const submitted = await createAndSubmitApplication(request, session, space, {
      formDefinitionId: setup.definitionId,
      fieldKey: setup.fieldKey,
      value: uniqueE2eLabel("状態遷移対象"),
    });
    expect(submitted.status).toBe("in_review");

    const approved = await approveApplication(request, session, submitted.id);
    expect(approved.status).toBe("approved");

    await expectApiError(
      await request.post(
        `${getE2eEnv().apiBase}/applications/${submitted.id}/approve`,
        {
          headers: authHeaders(session.accessToken),
          data: { comment: "承認済みの再承認", expectedStepOrder: 1 },
        },
      ),
      {
        errorCode: "APPLICATION_REVIEW_STATE_CONFLICT",
        status: 409,
      },
    );
    await expectApiError(
      await request.post(
        `${getE2eEnv().apiBase}/applications/${submitted.id}/reject`,
        {
          headers: authHeaders(session.accessToken),
          data: { comment: "承認済みの却下", expectedStepOrder: 1 },
        },
      ),
      {
        errorCode: "APPLICATION_REVIEW_STATE_CONFLICT",
        status: 409,
      },
    );
    await expectApiError(
      await request.post(
        `${getE2eEnv().apiBase}/applications/${submitted.id}/return`,
        {
          headers: authHeaders(session.accessToken),
          data: {
            expectedStepOrder: 1,
            overallComment: "承認済みの差し戻し",
            fields: [{ fieldId: field.id, comment: "終端状態では不可" }],
          },
        },
      ),
      {
        errorCode: "APPLICATION_REVIEW_STATE_CONFLICT",
        status: 409,
      },
    );

    const unchanged = await getApplication(request, session, submitted.id);
    expect(unchanged.status).toBe("approved");
    expect(unchanged.values?.[setup.fieldKey]).toBe(
      submitted.values?.[setup.fieldKey],
    );
  });
});

async function createAndSubmitApplication(
  request: APIRequestContext,
  session: E2eSession,
  space: E2eSpace,
  input: {
    fieldKey: string;
    formDefinitionId: string;
    value: string;
  },
): Promise<ApplicationDetail> {
  const { apiBase } = getE2eEnv();
  const created = await unwrapApiData<ApplicationCreateResponse>(
    await request.post(`${apiBase}/applications`, {
      headers: authHeaders(session.accessToken),
      data: {
        groupId: space.id,
        formDefinitionId: input.formDefinitionId,
        values: { [input.fieldKey]: input.value },
      },
    }),
    "create workflow guard application",
  );
  expect(created.status).toBe("draft");

  return unwrapApiData<ApplicationDetail>(
    await request.post(`${apiBase}/applications/${created.id}/submit`, {
      headers: authHeaders(session.accessToken),
    }),
    "submit workflow guard application",
  );
}

async function approveApplication(
  request: APIRequestContext,
  session: E2eSession,
  applicationId: string,
): Promise<ApplicationDetail> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<ApplicationDetail>(
    await request.post(`${apiBase}/applications/${applicationId}/approve`, {
      headers: authHeaders(session.accessToken),
      data: { comment: "E2E 承認", expectedStepOrder: 1 },
    }),
    "approve workflow guard application",
  );
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
    "get workflow guard application",
  );
}

async function getPrimaryField(
  request: APIRequestContext,
  session: E2eSession,
  setup: PublishedFormSetup,
): Promise<{ fieldKey: string; id: string }> {
  const { apiBase } = getE2eEnv();
  const definition = await unwrapApiData<FormDefinitionDetail>(
    await request.get(`${apiBase}/form-definitions/${setup.definitionId}`, {
      headers: authHeaders(session.accessToken),
    }),
    "get workflow guard form definition",
  );
  const field = definition.fields?.find(
    (candidate) => candidate.fieldKey === setup.fieldKey,
  );
  expect(field, "primary form field was not found").toBeTruthy();
  return field as { fieldKey: string; id: string };
}

async function expectApiError(
  response: APIResponse,
  expected: {
    errorCode: string;
    status: number;
  },
): Promise<void> {
  expect(response.status()).toBe(expected.status);
  const body = (await response.json()) as ApiErrorBody;
  expect(body.errorCode).toBe(expected.errorCode);
}
