import type { DynamicFormField } from "@/app/_components/applications/dynamic-fields";
import type { FormDefinitionResponse } from "@/lib/schema";

export type PublicApplicationFormPageProps = {
  searchParams?: Promise<{
    formError?: string;
    submitted?: string;
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
