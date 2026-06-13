import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps-builder";
import type { DraftField } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type {
  ApplicationDetail,
  ApprovalFlowResponse,
  FormDefinitionResponse,
  FormFieldResponse,
  GroupMemberSummary,
} from "@/lib/schema";

export type SpaceApplicationEditPageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
  searchParams?: Promise<{
    correctionError?: string;
    definitionId?: string;
    setupError?: string;
    setupErrorDetail?: string;
  }>;
};

export type SpaceApplicationEditApiFailure = { status: number };

export type EditableApplicationDetail = ApplicationDetail;

export type EditableFormDefinition = Omit<FormDefinitionResponse, "fields"> & {
  fields?: EditableFormField[];
};

export type EditableFormField = Omit<
  FormFieldResponse,
  "fieldType" | "helpText" | "options" | "placeholder"
> & {
  fieldType: string;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
};

export type CorrectionTargetItem = {
  itemId: string;
  formFieldId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  comment: string | null;
  currentValue: unknown;
};

export type EditableApprovalFlow = Omit<ApprovalFlowResponse, "steps"> & {
  steps?: Array<{
    id: string;
    stepName: string;
    assigneeUserId?: string;
    assigneeUserIds?: string[];
    canReturn: boolean;
  }>;
};

export type EditableGroupMember = Omit<GroupMemberSummary, "name"> & {
  name: string | null;
};

export type EditableApplicationInitialState = {
  initialFields: DraftField[];
  initialSteps: ApprovalStepItem[];
};
