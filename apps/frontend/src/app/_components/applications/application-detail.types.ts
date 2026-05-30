import type { ReactNode } from "react";

export type ApplicationDetailViewModel = {
  formDefinitionId?: string;
  id: string;
  groupId?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  applicantEmail?: string;
  currentStepOrder?: number | null;
  currentStepCanReturn?: boolean | null;
  approvalProgress?: ApplicationProgressStep[];
  values: Record<string, unknown>;
};

export type ApplicationProgressUser = {
  id: string;
  email: string;
  name: string | null;
};

export type ApplicationProgressAction = {
  id: string;
  action: string;
  comment: string | null;
  actedAt: string;
  actedBy: ApplicationProgressUser;
};

export type ApplicationProgressStep = {
  id: string;
  stepOrder: number;
  stepName: string;
  canReturn: boolean;
  status: "pending" | "current" | "approved" | "returned" | "rejected";
  assignees: ApplicationProgressUser[];
  actions: ApplicationProgressAction[];
};

export type ApplicationFormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required?: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
};

export type ApplicationCorrectionTargetItem = {
  formFieldId: string;
  fieldKey: string;
  label: string;
};

export type ApplicationCorrection = {
  id: string;
  status: string;
  overallComment: string | null;
  createdAt: string;
  items: Array<{
    fieldKey: string;
    comment: string | null;
  }>;
};

export type ApplicationDetailViewProps = {
  title: string;
  description?: string;
  application: ApplicationDetailViewModel;
  fields: ApplicationFormField[];
  fieldsTitle?: string;
  fieldsDescription?: string;
  openCorrectionItems?: ApplicationCorrectionTargetItem[];
  corrections?: ApplicationCorrection[];
  actions?: ReactNode;
  reviewerActions?: ReactNode;
  showApplicantEmail?: boolean;
  showCurrentStep?: boolean;
  showTimestamps?: boolean;
  showCorrectionHistory?: boolean;
  showOpenCorrectionSummary?: boolean;
  publicApplicationUrlPath?: string;
};
