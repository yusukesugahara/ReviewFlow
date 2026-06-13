import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
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
import { createPublishedFormSetup } from "./helpers/public-application";

type ApplicationCreateResponse = {
  id: string;
  status: string;
};

type ApplicationDetail = {
  id: string;
  groupId: string | null;
  status: string;
  values?: Record<string, unknown>;
};

type AuditLogList = {
  logs?: Array<{ applicationId: string | null }>;
  total: number;
};

type ApiErrorBody = {
  errorCode?: string;
};

test.describe("テナントとスペースの権限境界", () => {
  test("別テナントのスペースや申請を直接APIで参照・操作できない", async ({
    request,
  }) => {
    const tenantA = await createTenantAdmin(request, {
      emailPrefix: "boundary-a",
    });
    const tenantB = await createTenantAdmin(request, {
      emailPrefix: "boundary-b",
    });
    const spaceA = await createSpace(request, tenantA, {
      name: uniqueE2eLabel("境界確認Aスペース"),
    });
    const spaceB = await createSpace(request, tenantB, {
      name: uniqueE2eLabel("境界確認Bスペース"),
    });
    const setupA = await createPublishedFormSetup(request, tenantA, spaceA);
    const applicationValue = uniqueE2eLabel("境界確認申請");
    const applicationA = await createAndSubmitApplication(request, tenantA, spaceA, {
      formDefinitionId: setupA.definitionId,
      fieldKey: setupA.fieldKey,
      value: applicationValue,
    });

    const ownDetail = await getApplication(request, tenantA, applicationA.id);
    expect(ownDetail).toMatchObject({
      groupId: spaceA.id,
      id: applicationA.id,
      status: "in_review",
    });
    expect(ownDetail.values?.[setupA.fieldKey]).toBe(applicationValue);

    const tenantBSpaces = await listSpaces(request, tenantB);
    expect(tenantBSpaces.map((space) => space.id)).toContain(spaceB.id);
    expect(tenantBSpaces.map((space) => space.id)).not.toContain(spaceA.id);

    await expectApiError(
      await request.get(`${getE2eEnv().apiBase}/applications`, {
        headers: authHeaders(tenantB.accessToken),
        params: { groupId: spaceA.id },
      }),
      {
        errorCode: "GROUP_NOT_FOUND",
        status: 404,
      },
    );
    await expectApiError(
      await request.patch(`${getE2eEnv().apiBase}/groups/${spaceA.id}`, {
        headers: authHeaders(tenantB.accessToken),
        data: {
          name: uniqueE2eLabel("不正更新"),
          description: "別テナントからの更新",
        },
      }),
      {
        errorCode: "GROUP_NOT_FOUND",
        status: 404,
      },
    );
    await expectApiError(
      await request.get(`${getE2eEnv().apiBase}/applications/${applicationA.id}`, {
        headers: authHeaders(tenantB.accessToken),
      }),
      {
        errorCode: "APPLICATION_NOT_FOUND",
        status: 404,
      },
    );
    await expectApiError(
      await request.post(
        `${getE2eEnv().apiBase}/applications/${applicationA.id}/approve`,
        {
          headers: authHeaders(tenantB.accessToken),
          data: { comment: "別テナントからの承認" },
        },
      ),
      {
        errorCode: "APPLICATION_NOT_FOUND",
        status: 404,
      },
    );

    const tenantBAuditLogs = await listApplicationAuditLogs(
      request,
      tenantB,
      applicationA.id,
    );
    expect(tenantBAuditLogs.total).toBe(0);
    expect(tenantBAuditLogs.logs ?? []).toHaveLength(0);
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
    "create boundary application",
  );
  expect(created.status).toBe("draft");

  return unwrapApiData<ApplicationDetail>(
    await request.post(`${apiBase}/applications/${created.id}/submit`, {
      headers: authHeaders(session.accessToken),
    }),
    "submit boundary application",
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
    "get boundary application",
  );
}

async function listSpaces(
  request: APIRequestContext,
  session: E2eSession,
): Promise<E2eSpace[]> {
  const { apiBase } = getE2eEnv();
  const body = await unwrapApiData<{ groups?: E2eSpace[] }>(
    await request.get(`${apiBase}/groups`, {
      headers: authHeaders(session.accessToken),
    }),
    "list boundary spaces",
  );
  return body.groups ?? [];
}

async function listApplicationAuditLogs(
  request: APIRequestContext,
  session: E2eSession,
  applicationId: string,
): Promise<AuditLogList> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<AuditLogList>(
    await request.get(`${apiBase}/audit-logs`, {
      headers: authHeaders(session.accessToken),
      params: { applicationId, limit: 20 },
    }),
    "list boundary application audit logs",
  );
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
