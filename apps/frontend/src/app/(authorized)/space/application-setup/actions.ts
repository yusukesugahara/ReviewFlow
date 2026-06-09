"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";
import { unwrapData } from "@/lib/server/api-envelope";
import {
  APPLICATION_SETUP_ERRORS,
  APPLICATION_SETUP_ERROR_MESSAGES,
} from "@/lib/constants/application-setup";
import {
  parseSteps,
  readApplicationSetupForm,
  readDraftFields,
  type ApprovalStepInput,
} from "./application-setup-form-parser";
import {
  toApprovalStepRequest,
  toFieldPayloads,
  toFieldRequest,
} from "./application-setup-payload";
import type { DraftField } from "@/components/application-setup/application-setup-draft-form";

type CreateDefinitionResponse = {
  id: string;
};

type CreateApprovalFlowResponse = {
  id: string;
};

type CreateApplicationResponse = {
  id: string;
};

type BackendErrorBody = {
  errorCode?: unknown;
  message?: unknown;
};

function redirectUrlWithParams(
  base: string,
  params: Record<string, string>,
): string {
  const [pathWithSearch = "", hash = ""] = base.split("#", 2);
  const [path, search = ""] = pathWithSearch.split("?", 2);
  const nextParams = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    nextParams.set(key, value);
  }
  const nextSearch = nextParams.toString();
  return `${path}${nextSearch ? `?${nextSearch}` : ""}${hash ? `#${hash}` : ""}`;
}

function setupErrorRedirectUrl(base: string, error: unknown): string {
  const params = new URLSearchParams({
    toast: "error",
    message: APPLICATION_SETUP_ERROR_MESSAGES[APPLICATION_SETUP_ERRORS.saveFailed],
  });
  if (isApiFailure(error)) {
    const body = error.body as BackendErrorBody;
    const message = errorMessageFromBody(error.body);
    const errorCode =
      typeof body.errorCode === "string" ? body.errorCode : undefined;
    const detail = errorCode
      ? `${errorCode}: ${message}`
      : `${error.status}: ${message}`;
    params.set("message", `申請フォームの保存に失敗しました（${detail}）`);
  }
  return redirectUrlWithParams(base, Object.fromEntries(params));
}

export async function submitApplicationSetupAction(
  formData: FormData,
): Promise<void> {
  const parsedForm = readApplicationSetupForm(formData);
  const returnPath = formData.get("returnPath");
  const redirectBase =
    typeof returnPath === "string" && returnPath.startsWith("/space/")
      ? returnPath
      : "/space/application-setup";

  if (!parsedForm.success) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidName,
      }),
    );
  }

  const { fieldsJson, intent, name, spaceId, stepsJson } = parsedForm.data;
  const applicationStatus = intent === "publish" ? "published" : "draft";

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidFields,
      }),
    );
  }
  if (fields.length === 0) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidFields,
      }),
    );
  }

  let steps: ApprovalStepInput[];
  try {
    steps = parseSteps(stepsJson);
  } catch {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidSteps,
      }),
    );
  }
  if (steps.length === 0) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidSteps,
      }),
    );
  }

  const fieldPayloads = toFieldPayloads(fields);
  let createdDefinitionId = "";
  let createdApplicationId = "";

  try {
    const authHeaders = await authHeadersOrRedirect();
    const createdResponse = await client.POST("/form-definitions", {
      body: {
        groupId: spaceId,
        name: name.trim(),
        description: `${name.trim()} の申請`,
      },
      headers: authHeaders,
    });
    if (!createdResponse.response.ok || !createdResponse.data) {
      throw { status: createdResponse.response.status, body: createdResponse.error };
    }
    const created = unwrapData<CreateDefinitionResponse>(createdResponse.data);
    createdDefinitionId = created.id;

    for (const field of fieldPayloads) {
      const fieldResponse = await client.POST("/form-definitions/{id}/fields", {
        params: { path: { id: createdDefinitionId } },
        body: toFieldRequest(field),
        headers: authHeaders,
      });
      if (!fieldResponse.response.ok) {
        throw { status: fieldResponse.response.status, body: fieldResponse.error };
      }
    }

    const publishResponse = await client.POST("/form-definitions/{id}/publish", {
      params: { path: { id: createdDefinitionId } },
      headers: authHeaders,
    });
    if (!publishResponse.response.ok) {
      throw { status: publishResponse.response.status, body: publishResponse.error };
    }

    const flowResponse = await client.POST("/approval-flows", {
      body: {
        groupId: spaceId,
        name: `${name.trim()} 承認フロー`,
        steps: toApprovalStepRequest(steps),
      },
      headers: authHeaders,
    });
    if (!flowResponse.response.ok || !flowResponse.data) {
      throw { status: flowResponse.response.status, body: flowResponse.error };
    }
    const flow = unwrapData<CreateApprovalFlowResponse>(flowResponse.data);

    const applicationResponse = await client.POST("/applications", {
      body: {
        groupId: spaceId,
        formDefinitionId: createdDefinitionId,
        approvalFlowId: flow.id,
        status: applicationStatus,
        values: {},
      },
      headers: authHeaders,
    });
    if (!applicationResponse.response.ok || !applicationResponse.data) {
      throw { status: applicationResponse.response.status, body: applicationResponse.error };
    }
    const application = unwrapData<CreateApplicationResponse>(applicationResponse.data);
    createdApplicationId = application.id;
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const listPath = `/space/${encodeURIComponent(spaceId)}/applications`;
  const detailPath = `${listPath}/${encodeURIComponent(
    createdApplicationId,
  )}?${new URLSearchParams({
    definitionId: createdDefinitionId,
    toast: "success",
    message:
      applicationStatus === "published"
        ? "申請フォームを公開しました"
        : "申請フォームを下書き保存しました",
  }).toString()}`;
  revalidatePath(redirectBase);
  revalidatePath(listPath);
  redirect(detailPath);
}

export async function updateApplicationSetupAction(
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const parsedForm = readApplicationSetupForm(formData);
  const returnPath = formData.get("returnPath");
  const rawSpaceId = formData.get("spaceId");
  const redirectBase =
    typeof returnPath === "string" && returnPath.startsWith("/space/")
      ? returnPath
      : `/space/${typeof rawSpaceId === "string" ? encodeURIComponent(rawSpaceId) : ""}/applications/${encodeURIComponent(applicationId)}/edit`;

  if (!parsedForm.success) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidName,
      }),
    );
  }

  const {
    currentApprovalFlowId,
    currentFormDefinitionId,
    fieldsJson,
    intent,
    name,
    spaceId,
    stepsJson,
  } = parsedForm.data;
  const applicationStatus = intent === "publish" ? "published" : "draft";

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidFields,
      }),
    );
  }
  if (fields.length === 0) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidFields,
      }),
    );
  }

  let steps: ApprovalStepInput[];
  try {
    steps = parseSteps(stepsJson);
  } catch {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidSteps,
      }),
    );
  }
  if (steps.length === 0) {
    redirect(
      redirectUrlWithParams(redirectBase, {
        setupError: APPLICATION_SETUP_ERRORS.invalidSteps,
      }),
    );
  }

  if (!currentFormDefinitionId || !currentApprovalFlowId) {
    redirect(setupErrorRedirectUrl(redirectBase, null));
  }

  try {
    const authHeaders = await authHeadersOrRedirect();
    const flowResponse = await client.PATCH("/approval-flows/{id}", {
      params: { path: { id: currentApprovalFlowId } },
      body: {
        name: `${name.trim()} 承認フロー`,
        steps: toApprovalStepRequest(steps),
      },
      headers: authHeaders,
    });
    if (!flowResponse.response.ok) {
      throw { status: flowResponse.response.status, body: flowResponse.error };
    }

    const applicationResponse = await client.PATCH("/applications/{id}", {
      params: { path: { id: applicationId } },
      body: {
        status: applicationStatus,
      },
      headers: authHeaders,
    });
    if (!applicationResponse.response.ok) {
      throw { status: applicationResponse.response.status, body: applicationResponse.error };
    }
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const detailPath = `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(
    applicationId,
  )}?${new URLSearchParams({
    definitionId: currentFormDefinitionId,
    toast: "success",
    message:
      applicationStatus === "published"
        ? "申請フォームを公開しました"
        : "申請フォームを下書き保存しました",
  }).toString()}`;
  revalidatePath(redirectBase);
  revalidatePath(`/space/${encodeURIComponent(spaceId)}/applications`);
  revalidatePath(detailPath);
  redirect(detailPath);
}
