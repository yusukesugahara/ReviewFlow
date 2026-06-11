import type { DraftField } from "@/components/application-setup/application-setup-draft-form";
import {
  APPLICATION_SETUP_ERRORS,
  type ApplicationSetupError,
} from "@/lib/constants/application-setup";
import {
  parseSteps,
  readApplicationSetupForm,
  readDraftFields,
  type ApprovalStepInput,
} from "./application-setup-form-parser";

export type ApplicationSetupApplicationStatus = "draft" | "published";

export type ApplicationSetupActionInput = {
  applicationStatus: ApplicationSetupApplicationStatus;
  currentApprovalFlowId?: string;
  currentFormDefinitionId?: string;
  fields: DraftField[];
  name: string;
  spaceId: string;
  steps: ApprovalStepInput[];
};

export type ApplicationSetupActionInputResult =
  | { success: true; data: ApplicationSetupActionInput }
  | { success: false; error: ApplicationSetupError };

export function readApplicationSetupActionInput(
  formData: FormData,
): ApplicationSetupActionInputResult {
  const parsedForm = readApplicationSetupForm(formData);
  if (!parsedForm.success) {
    return { success: false, error: APPLICATION_SETUP_ERRORS.invalidName };
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

  let fields: DraftField[];
  try {
    fields = readDraftFields(fieldsJson);
  } catch {
    return { success: false, error: APPLICATION_SETUP_ERRORS.invalidFields };
  }
  if (fields.length === 0) {
    return { success: false, error: APPLICATION_SETUP_ERRORS.invalidFields };
  }

  let steps: ApprovalStepInput[];
  try {
    steps = parseSteps(stepsJson);
  } catch {
    return { success: false, error: APPLICATION_SETUP_ERRORS.invalidSteps };
  }
  if (steps.length === 0) {
    return { success: false, error: APPLICATION_SETUP_ERRORS.invalidSteps };
  }

  return {
    success: true,
    data: {
      applicationStatus: intent === "publish" ? "published" : "draft",
      currentApprovalFlowId,
      currentFormDefinitionId,
      fields,
      name,
      spaceId,
      steps,
    },
  };
}
