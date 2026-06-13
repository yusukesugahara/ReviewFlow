import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { getE2eEnv } from "../src/lib/e2e-env";
import {
  authHeaders,
  createApplicantAccessToken,
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

type ApplicationDetail = {
  id: string;
  status: string;
  values?: Record<string, unknown>;
};

type ApiErrorBody = {
  errorCode?: string;
};

type CorrectionTargets = {
  applicationStatus: string;
  openCorrection: {
    items?: Array<{
      currentValue: unknown;
      fieldKey: string;
    }>;
  } | null;
};

type FormDefinitionDetail = {
  fields?: Array<{
    fieldKey: string;
    id: string;
  }>;
};

test.describe("申請者アクセストークンの権限境界", () => {
  test("差し戻し用トークンでは同じ申請者の別申請を修正・再提出できない", async ({
    request,
  }) => {
    const session = await createTenantAdmin(request, {
      emailPrefix: "applicant-boundary",
    });
    const space = await createSpace(request, session, {
      name: uniqueE2eLabel("申請者境界スペース"),
    });
    const setup = await createPublishedFormSetup(request, session, space);
    const field = await getPrimaryField(request, session, setup);
    const applicantEmail = `${uniqueE2eLabel("same-applicant")}@example.com`;
    const returnedValue = uniqueE2eLabel("差し戻し対象申請");
    const otherValue = uniqueE2eLabel("別申請の内容");

    const returnedApplication = await createPublicApplication(request, {
      applicantEmail,
      session,
      setup,
      space,
      value: returnedValue,
    });
    const otherApplication = await createPublicApplication(request, {
      applicantEmail,
      session,
      setup,
      space,
      value: otherValue,
    });
    expect(returnedApplication.status).toBe("in_review");
    expect(otherApplication.status).toBe("in_review");

    const returned = await returnApplicationForCorrection(request, session, {
      applicationId: returnedApplication.id,
      fieldId: field.id,
    });
    expect(returned.status).toBe("returned");

    const returnedToken = createApplicantAccessToken({
      applicationId: returnedApplication.id,
      email: applicantEmail,
      formDefinitionId: setup.definitionId,
      groupId: space.id,
      tenantId: session.user.tenantId,
    });
    const correction = await getReturnedCorrection(request, returnedToken);
    expect(correction.applicationStatus).toBe("returned");
    expect(correction.openCorrection?.items?.[0]).toMatchObject({
      currentValue: returnedValue,
      fieldKey: setup.fieldKey,
    });

    await expectApiError(
      await request.patch(
        `${getE2eEnv().apiBase}/public/applications/${otherApplication.id}`,
        {
          headers: applicantHeaders(returnedToken),
          data: { values: { [setup.fieldKey]: uniqueE2eLabel("不正修正") } },
        },
      ),
      {
        errorCode: "APPLICATION_ACCESS_DENIED",
        status: 403,
      },
    );
    await expectApiError(
      await request.post(
        `${getE2eEnv().apiBase}/public/applications/${otherApplication.id}/resubmit`,
        {
          headers: applicantHeaders(returnedToken),
        },
      ),
      {
        errorCode: "APPLICATION_ACCESS_DENIED",
        status: 403,
      },
    );

    const unchangedOtherApplication = await getApplication(
      request,
      session,
      otherApplication.id,
    );
    expect(unchangedOtherApplication).toMatchObject({
      status: "in_review",
    });
    expect(unchangedOtherApplication.values?.[setup.fieldKey]).toBe(otherValue);
  });
});

async function createPublicApplication(
  request: APIRequestContext,
  input: {
    applicantEmail: string;
    session: E2eSession;
    setup: PublishedFormSetup;
    space: E2eSpace;
    value: string;
  },
): Promise<ApplicationDetail> {
  const { apiBase } = getE2eEnv();
  const token = createApplicantAccessToken({
    email: input.applicantEmail,
    formDefinitionId: input.setup.definitionId,
    groupId: input.space.id,
    tenantId: input.session.user.tenantId,
  });
  return unwrapApiData<ApplicationDetail>(
    await request.post(`${apiBase}/public/applications`, {
      headers: applicantHeaders(token),
      data: {
        groupId: input.space.id,
        formDefinitionId: input.setup.definitionId,
        values: { [input.setup.fieldKey]: input.value },
      },
    }),
    "create public boundary application",
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
    "get public boundary form definition",
  );
  const field = definition.fields?.find(
    (candidate) => candidate.fieldKey === setup.fieldKey,
  );
  expect(field, "primary form field was not found").toBeTruthy();
  return field as { fieldKey: string; id: string };
}

async function returnApplicationForCorrection(
  request: APIRequestContext,
  session: E2eSession,
  input: {
    applicationId: string;
    fieldId: string;
  },
): Promise<ApplicationDetail> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<ApplicationDetail>(
    await request.post(`${apiBase}/applications/${input.applicationId}/return`, {
      headers: authHeaders(session.accessToken),
      data: {
        overallComment: "E2E 申請者トークン境界の差し戻し",
        fields: [
          {
            fieldId: input.fieldId,
            comment: "この申請だけを修正対象にする",
          },
        ],
      },
    }),
    "return public boundary application",
  );
}

async function getReturnedCorrection(
  request: APIRequestContext,
  applicantToken: string,
): Promise<CorrectionTargets> {
  const { apiBase } = getE2eEnv();
  return unwrapApiData<CorrectionTargets>(
    await request.get(`${apiBase}/public/applications/returned/current`, {
      headers: applicantHeaders(applicantToken),
    }),
    "get returned public boundary correction",
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
    "get unchanged public boundary application",
  );
}

function applicantHeaders(applicantToken: string): Record<string, string> {
  const { internalApiKey } = getE2eEnv();
  return {
    "X-API-Key": internalApiKey,
    "X-Applicant-Access-Token": applicantToken,
  };
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
