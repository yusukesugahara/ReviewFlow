import { z } from "zod";
import type { DraftField } from "@/components/application-setup/application-setup-draft-form";
import { FIELD_TYPES } from "@/lib/constants/form-fields";

const applicationSetupFormSchema = z.object({
  name: z.string().trim().min(1),
  fieldsJson: z.string(),
  stepsJson: z.string(),
  spaceId: z.string().min(1),
  returnPath: z.string().optional(),
  intent: z.string().optional(),
});

export type ApplicationSetupForm = z.infer<typeof applicationSetupFormSchema>;

export type ApprovalStepInput = {
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

export function readApplicationSetupForm(formData: FormData) {
  return applicationSetupFormSchema.safeParse({
    name: formData.get("name"),
    fieldsJson: formData.get("fieldsJson"),
    stepsJson: formData.get("stepsJson"),
    spaceId: formData.get("spaceId"),
    returnPath: formData.get("returnPath") || undefined,
    intent: formData.get("intent") || undefined,
  });
}

export function readDraftFields(fieldsJson: FormDataEntryValue | null): DraftField[] {
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
          raw.fieldType === "checkbox" ||
          raw.fieldType === "consent" ||
          raw.fieldType === "description" ||
          raw.fieldType === "section"
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

export function parseSteps(stepsJson: string): ApprovalStepInput[] {
  const parsed: unknown = JSON.parse(stepsJson);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item, index): ApprovalStepInput[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    const stepNameRaw =
      typeof raw.stepName === "string" ? raw.stepName.trim() : "";
    const assigneeUserIds = Array.isArray(raw.assigneeUserIds)
      ? raw.assigneeUserIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
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
    return [
      {
        stepOrder: index + 1,
        stepName: stepNameRaw || `Step ${index + 1}`,
        assigneeUserId: primaryAssigneeUserId,
        assigneeUserIds: Array.from(new Set(assigneeUserIds)),
        canReturn: raw.canReturn === true,
      },
    ];
  });
}
