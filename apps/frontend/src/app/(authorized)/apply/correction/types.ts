import type { DynamicFormField } from "@/components/applications/dynamic-fields";
import type { FormDefinitionResponse } from "@/lib/schema";

export type PublicCorrectionPageProps = {
  searchParams?: Promise<{
    formError?: string;
    message?: string;
    resubmitted?: string;
    toast?: string;
  }>;
};

export type PublicCorrectionTarget = {
  itemId: string;
  formFieldId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  comment: string | null;
  currentValue: unknown;
};

export type PublicCorrectionResponse = {
  applicationId: string;
  applicationStatus: string;
  openCorrection: {
    id: string;
    overallComment: string | null;
    createdAt: string;
    items: PublicCorrectionTarget[];
  } | null;
};

export type PublicCorrectionFormDefinition = Omit<
  FormDefinitionResponse,
  "fields" | "description"
> & {
  description?: string | null;
  fields?: DynamicFormField[];
};

export type PublicCorrectionSubmitState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  missingFieldLabels?: string[];
};
