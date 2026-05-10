"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BackendHttpError,
  backendAuthFetchJson,
  errorMessageFromBody,
} from "@/lib/server/backend-fetch";
import {
  APPLICATION_SETUP_ERRORS,
} from "@/lib/constants/application-setup";
import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
} from "@/lib/constants/form-fields";
import type { DraftField } from "@/app/space/_components/application-setup-draft-form";

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
  fieldType: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options: { label: string; value: string }[];
  sortOrder: number;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function setupErrorRedirectUrl(base: string, error: unknown): string {
  const params = new URLSearchParams({
    setupError: APPLICATION_SETUP_ERRORS.saveFailed,
  });
  if (error instanceof BackendHttpError) {
    const body = error.body as BackendErrorBody;
    const message = errorMessageFromBody(error.body);
    const errorCode =
      typeof body.errorCode === "string" ? body.errorCode : undefined;
    const detail = errorCode
      ? `${errorCode}: ${message}`
      : `${error.status}: ${message}`;
    params.set("setupErrorDetail", detail);
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
  const name = formData.get("name");
  const fieldsJson = formData.get("fieldsJson");
  const stepsJson = formData.get("stepsJson");
  const spaceId = formData.get("spaceId");
  const returnPath = formData.get("returnPath");
  const redirectBase =
    typeof returnPath === "string" && returnPath.startsWith("/space/")
      ? returnPath
      : "/space/application-setup";

  if (typeof name !== "string" || name.trim().length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }
  if (typeof spaceId !== "string" || spaceId.length === 0) {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }
  if (typeof stepsJson !== "string") {
    redirect(
      `${redirectBase}?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }

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
    const createdRaw = await backendAuthFetchJson("/form-definitions", {
      method: "POST",
      body: {
        groupId: spaceId,
        name: name.trim(),
        description: `${name.trim()} の申請`,
      },
    });
    const created = unwrapData<CreateDefinitionResponse>(createdRaw);
    createdDefinitionId = created.id;

    for (const field of fieldPayloads) {
      await backendAuthFetchJson(
        `/form-definitions/${createdDefinitionId}/fields`,
        {
          method: "POST",
          body: field,
        },
      );
    }

    await backendAuthFetchJson(
      `/form-definitions/${createdDefinitionId}/publish`,
      {
        method: "POST",
        body: {},
      },
    );

    const flowRaw = await backendAuthFetchJson("/approval-flows", {
      method: "POST",
      body: {
        groupId: spaceId,
        name: `${name.trim()} 承認フロー`,
        steps,
      },
    });
    const flow = unwrapData<CreateApprovalFlowResponse>(flowRaw);

    const applicationRaw = await backendAuthFetchJson("/applications", {
      method: "POST",
      body: {
        groupId: spaceId,
        approvalFlowId: flow.id,
        values: {},
      },
    });
    const application = unwrapData<CreateApplicationResponse>(applicationRaw);
    createdApplicationId = application.id;
  } catch (error) {
    redirect(setupErrorRedirectUrl(redirectBase, error));
  }

  const listPath = `/space/${encodeURIComponent(spaceId)}/applications`;
  const detailPath = `${listPath}/${encodeURIComponent(
    createdApplicationId,
  )}?definitionId=${encodeURIComponent(createdDefinitionId)}`;
  revalidatePath(redirectBase);
  revalidatePath(listPath);
  redirect(detailPath);
}
