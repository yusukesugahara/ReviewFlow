import type { ApplicationSummary, FormDefinitionResponse } from "@/lib/schema";

export type ApplicationRow = Pick<
  ApplicationSummary,
  | "applicationName"
  | "formDefinitionId"
  | "formDefinitionName"
  | "id"
  | "groupId"
  | "status"
  | "applicantEmail"
  | "createdAt"
  | "updatedAt"
> & {
  applicantUserId?: string | null;
};

export type FormDefinitionRow = Omit<
  FormDefinitionResponse,
  "createdByUserId" | "description" | "fields"
> & {
  createdByUserId?: string;
  description?: string | null;
  fields?: unknown[];
};

export type SpaceApplicationsPageContentProps = {
  applications: ApplicationRow[];
  formDefinitions: FormDefinitionRow[];
  fetchErrorStatus?: number;
  showArchived: boolean;
  spaceId: string;
};
