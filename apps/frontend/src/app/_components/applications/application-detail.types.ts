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
  values: Record<string, unknown>;
};

export type ApplicationFormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required?: boolean;
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
