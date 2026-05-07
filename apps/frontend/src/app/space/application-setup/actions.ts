"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BackendHttpError,
  backendAuthFetchJson,
} from "@/lib/server/backend-fetch";
import {
  APPLICATION_SETUP_ERRORS,
  APPLICATION_SETUP_STATUSES,
} from "@/lib/constants/application-setup";
import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
} from "@/lib/constants/form-fields";
import type { DraftField } from "@/app/space/_components/application-setup-draft-form";

type CreateDefinitionResponse = {
  id: string;
};

type SetupIntent = "draft" | "publish";

type ApprovalStepPayload = {
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
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

function parseSteps(stepLines: string): ApprovalStepPayload[] {
  const lines = stepLines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const [stepNameRaw = "", assigneeUserIdRaw = "", canReturnRaw = ""] = line
      .split(",")
      .map((value) => value?.trim() ?? "");
    return {
      stepOrder: index + 1,
      stepName: stepNameRaw || `Step ${index + 1}`,
      assigneeUserId: assigneeUserIdRaw,
      canReturn: canReturnRaw === "true",
    };
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
  const stepLines = formData.get("stepLines");
  const intent = formData.get("intent");
  const spaceId = formData.get("spaceId");

  if (typeof name !== "string" || name.trim().length === 0) {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }
  if (typeof spaceId !== "string" || spaceId.length === 0) {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidName}`,
    );
  }
  if (typeof stepLines !== "string") {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }
  if (fields.length === 0) {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidFields}`,
    );
  }

  const steps = parseSteps(stepLines);
  if (steps.length === 0) {
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.invalidSteps}`,
    );
  }

  const resolvedIntent: SetupIntent = intent === "publish" ? "publish" : "draft";
  const fieldPayloads = toFieldPayloads(fields);
  let createdId = "";

  try {
    const createdRaw = await backendAuthFetchJson("/form-definitions", {
      method: "POST",
      body: {
        groupId: spaceId,
        name: name.trim(),
        description: `${name.trim()} の申請フォーム`,
      },
    });
    const created = unwrapData<CreateDefinitionResponse>(createdRaw);
    createdId = created.id;

    for (const field of fieldPayloads) {
      await backendAuthFetchJson(`/form-definitions/${createdId}/fields`, {
        method: "POST",
        body: field,
      });
    }

    if (resolvedIntent === "publish") {
      await backendAuthFetchJson(`/form-definitions/${createdId}/publish`, {
        method: "POST",
        body: {},
      });
    }

    await backendAuthFetchJson("/approval-flows", {
      method: "POST",
      body: {
        groupId: spaceId,
        name: `${name.trim()} 承認フロー`,
        steps,
      },
    });
  } catch (error) {
    if (
      error instanceof BackendHttpError &&
      resolvedIntent === "draft" &&
      createdId.length > 0 &&
      error.status === 409
    ) {
      revalidatePath("/space/application-setup");
      redirect(
        `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.approvalFlowRequiresPublish}`,
      );
    }
    redirect(
      `/space/application-setup?setupError=${APPLICATION_SETUP_ERRORS.saveFailed}`,
    );
  }

  revalidatePath("/space/application-setup");
  redirect(
    `/space/application-setup?setupStatus=${
      resolvedIntent === "publish"
        ? APPLICATION_SETUP_STATUSES.published
        : APPLICATION_SETUP_STATUSES.draftSaved
    }${
      resolvedIntent === "publish"
        ? `&publishedGroupId=${encodeURIComponent(spaceId)}`
        : ""
    }`,
  );
}
