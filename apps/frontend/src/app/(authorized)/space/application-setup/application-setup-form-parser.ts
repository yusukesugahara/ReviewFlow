import { z } from "zod";
import type { DraftField } from "@/components/application-setup/application-setup-fields";
import { FIELD_TYPES } from "@/lib/constants/form-fields";

const applicationSetupFormSchema = z.object({
  name: z.string().trim().min(1),
  fieldsJson: z.string(),
  stepsJson: z.string(),
  spaceId: z.string().min(1),
  returnPath: z.string().optional(),
  intent: z.string().optional(),
  currentFormDefinitionId: z.string().optional(),
  currentApprovalFlowId: z.string().optional(),
});

export type ApplicationSetupForm = z.infer<typeof applicationSetupFormSchema>;

export type ApprovalStepInput = {
  stepOrder: number;
  stepName: string;
  assigneeUserId: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

const draftFieldTypeSchema = z
  .enum([
    FIELD_TYPES.text,
    FIELD_TYPES.textarea,
    FIELD_TYPES.number,
    FIELD_TYPES.date,
    FIELD_TYPES.select,
    FIELD_TYPES.radio,
    FIELD_TYPES.checkbox,
    FIELD_TYPES.consent,
    FIELD_TYPES.description,
    FIELD_TYPES.section,
  ])
  .catch(FIELD_TYPES.text);

const draftFieldSchema = z.object({
  id: z.string(),
  fieldKey: z.string().optional(),
  label: z.string(),
  fieldType: draftFieldTypeSchema,
  required: z.boolean(),
  placeholder: z.string().catch(""),
  helpText: z.string().catch(""),
  optionsText: z.string().catch(""),
});

const unknownArraySchema = z.array(z.unknown());

const approvalStepSchema = z.object({
  stepName: z.string().trim().catch(""),
  assigneeUserId: z.string().min(1).optional(),
  assigneeUserIds: z.array(z.string().min(1)).catch([]),
  canReturn: z.boolean().catch(false),
});

export function readApplicationSetupForm(formData: FormData) {
  return applicationSetupFormSchema.safeParse({
    name: formData.get("name"),
    fieldsJson: formData.get("fieldsJson"),
    stepsJson: formData.get("stepsJson"),
    spaceId: formData.get("spaceId"),
    returnPath: formData.get("returnPath") || undefined,
    intent: formData.get("intent") || undefined,
    currentFormDefinitionId:
      formData.get("currentFormDefinitionId") || undefined,
    currentApprovalFlowId: formData.get("currentApprovalFlowId") || undefined,
  });
}

export function readDraftFields(fieldsJson: FormDataEntryValue | null): DraftField[] {
  if (typeof fieldsJson !== "string") {
    return [];
  }
  const parsed: unknown = JSON.parse(fieldsJson);
  const items = unknownArraySchema.safeParse(parsed);
  if (!items.success) {
    return [];
  }
  return items.data.flatMap((item): DraftField[] => {
    const result = draftFieldSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

export function parseSteps(stepsJson: string): ApprovalStepInput[] {
  const parsed: unknown = JSON.parse(stepsJson);
  const items = unknownArraySchema.safeParse(parsed);
  if (!items.success) {
    return [];
  }

  return items.data.flatMap((item, index): ApprovalStepInput[] => {
    const result = approvalStepSchema.safeParse(item);
    if (!result.success) {
      return [];
    }
    const step = result.data;
    const assigneeUserIds =
      step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : step.assigneeUserId
          ? [step.assigneeUserId]
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
        stepName: step.stepName || `Step ${index + 1}`,
        assigneeUserId: primaryAssigneeUserId,
        assigneeUserIds: Array.from(new Set(assigneeUserIds)),
        canReturn: step.canReturn,
      },
    ];
  });
}
