"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import {
  APPLICATION_SETUP_ERRORS,
  APPLICATION_SETUP_ERROR_MESSAGES,
} from "@/lib/constants/application-setup";
import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  type FieldType,
} from "@/lib/constants/form-fields";
import type { DraftField } from "@/app/(authorized)/space/_components/application-setup-draft-form";

const applicationSetupFormSchema = z.object({
  name: z.string().trim().min(1),
  fieldsJson: z.string(),
  stepsJson: z.string(),
  spaceId: z.string().min(1),
  returnPath: z.string().optional(),
  intent: z.string().optional(),
});

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
type ApiFailure = { status: number; body: unknown };

type ApprovalStepPayload = {
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

type FieldPayload = {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options: { label: string; value: string }[];
  sortOrder: number;
};

type FieldRequest = Omit<FieldPayload, "options"> & {
  options?: ({} & { [key: string]: undefined })[];
};

function toFieldRequest(field: FieldPayload): FieldRequest {
  return {
    ...field,
    options: field.options as unknown as ({} & { [key: string]: undefined })[],
  };
}

type ApprovalStepRequest = {
  stepOrder: number;
  stepName: string;
  assigneeUserId?: string;
  assigneeUserIds?: unknown[][];
  canReturn: boolean;
};

function toApprovalStepRequest(steps: ApprovalStepPayload[]): ApprovalStepRequest[] {
  return steps.map((step) => ({
    stepOrder: step.stepOrder,
    stepName: step.stepName,
    assigneeUserId: step.assigneeUserId,
    assigneeUserIds: step.assigneeUserIds as unknown as unknown[][],
    canReturn: step.canReturn,
  }));
}

function readApplicationSetupForm(formData: FormData) {
  return applicationSetupFormSchema.safeParse({
    name: formData.get("name"),
    fieldsJson: formData.get("fieldsJson"),
    stepsJson: formData.get("stepsJson"),
    spaceId: formData.get("spaceId"),
    returnPath: formData.get("returnPath") || undefined,
    intent: formData.get("intent") || undefined,
  });
}

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is ApiFailure {
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as ApiFailure).status === "number" &&
    "body" in error
  );
}

function errorMessageFromBody(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "unknown_error";
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
  return `${base}?${params.toString()}`;
}

function parseSteps(stepsJson: string): ApprovalStepPayload[] {
  const parsed: unknown = JSON.parse(stepsJson);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item, index): ApprovalStepPayload[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    const stepNameRaw = typeof raw.stepName === "string" ? raw.stepName.trim() : "";
    const assigneeUserIds = Array.isArray(raw.assigneeUserIds)
      ? raw.assigneeUserIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : typeof raw.assigneeUserId === "string" && raw.assigneeUserId.length > 0
        ? [raw.assigneeUserId]
        : [];
    if (assigneeUserIds.length === 0) {
      return [];
    }
    const [primaryAssigneeUserId] = assigneeUserIds;
    if (!primaryAssigneeUserId) {
      return [];
    }
    return [{
      stepOrder: index + 1,
      stepName: stepNameRaw || `Step ${index + 1}`,
      assigneeUserId: primaryAssigneeUserId,
      assigneeUserIds: Array.from(new Set(assigneeUserIds)),
      canReturn: raw.canReturn === true,
    }];
  });
}

function parseOptions(optionsText: string): { label: string; value: string }[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index)
    .map((line) => ({ label: line, value: line }));
}

function normalizeFieldKey(
  label: string,
  index: number,
  usedKeys: Set<string>,
): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") || `field_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}

function readDraftFields(fieldsJson: FormDataEntryValue | null): DraftField[] {
  if (typeof fieldsJson !== "string") {
    return [];
  }
  const parsed: unknown = JSON.parse(fieldsJson);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((item): DraftField[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.label !== "string" ||
      typeof raw.fieldType !== "string" ||
      typeof raw.required !== "boolean"
    ) {
      return [];
    }
    return [
      {
        id: raw.id,
        label: raw.label,
        fieldType:
          raw.fieldType === "textarea" ||
          raw.fieldType === "number" ||
          raw.fieldType === "date" ||
          raw.fieldType === "select" ||
          raw.fieldType === "radio" ||
          raw.fieldType === "checkbox"
            ? raw.fieldType
            : FIELD_TYPES.text,
        required: raw.required,
        placeholder: typeof raw.placeholder === "string" ? raw.placeholder : "",
        helpText: typeof raw.helpText === "string" ? raw.helpText : "",
        optionsText: typeof raw.optionsText === "string" ? raw.optionsText : "",
      },
    ];
  });
}

function toFieldPayloads(fields: DraftField[]): FieldPayload[] {
  const usedKeys = new Set<string>();
  return fields.map((field, index) => {
    const label = field.label.trim() || `フォーム${index + 1}`;
    return {
      fieldKey: normalizeFieldKey(label, index, usedKeys),
      label,
      fieldType: field.fieldType,
      required: field.required,
      placeholder: field.placeholder.trim(),
      helpText: field.helpText.trim(),
      options: fieldTypeNeedsOptions(field.fieldType)
        ? parseOptions(field.optionsText)
        : [],
      sortOrder: index,
    };
  });
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
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }

  const { fieldsJson, intent, name, spaceId, stepsJson } = parsedForm.data;
  const applicationStatus = intent === "publish" ? "published" : "draft";

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }
  if (fields.length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }

  let steps: ApprovalStepPayload[];
  try {
    steps = parseSteps(stepsJson);
  } catch {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }
  if (steps.length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
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
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }

  const { fieldsJson, name, spaceId, stepsJson } = parsedForm.data;

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }
  if (fields.length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }

  let steps: ApprovalStepPayload[];
  try {
    steps = parseSteps(stepsJson);
  } catch {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }
  if (steps.length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }

  const fieldPayloads = toFieldPayloads(fields);
  let createdDefinitionId = "";

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

    const applicationResponse = await client.PATCH("/applications/{id}", {
      params: { path: { id: applicationId } },
      body: {
        formDefinitionId: createdDefinitionId,
        approvalFlowId: flow.id,
        values: {},
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
    definitionId: createdDefinitionId,
    toast: "success",
    message: "申請フォームを更新しました",
  }).toString()}`;
  revalidatePath(redirectBase);
  revalidatePath(`/space/${encodeURIComponent(spaceId)}/applications`);
  revalidatePath(detailPath);
  redirect(detailPath);
}
