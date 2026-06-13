import type { DynamicFormField } from "@/components/applications/dynamic-fields/dynamic-fields";
import type { FormDefinitionResponse } from "@/lib/schema";

export type PublicApplicationFormPageProps = {
  searchParams?: Promise<{
    formError?: string;
    message?: string;
    submitted?: string;
    toast?: string;
  }>;
};

export type PublicApplicationFormDefinition = Omit<FormDefinitionResponse, "fields" | "description"> & {
  description?: string | null;
  fields?: DynamicFormField[];
};

export type PublicApplicationFormViewProps = {
  definition: PublicApplicationFormDefinition;
  formError?: string;
};

export type PublicApplicationFormErrorViewProps = {
  status?: number;
};

export type PublicApplicationSubmitState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  missingFieldLabels?: string[];
};
