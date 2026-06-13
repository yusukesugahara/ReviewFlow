import type {
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/detail/application-detail.types";

export type SpaceApplicationDetailPageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
  searchParams?: Promise<{ actionError?: string; definitionId?: string }>;
};

export type SpaceApplicationDetailApiFailure = { status: number; body: unknown };

export type FormDefinitionDetail = {
  createdAt?: string;
  description?: string | null;
  fields?: ApplicationFormField[];
  id?: string;
  name?: string;
  status?: string;
  updatedAt?: string;
};

export type ApplicationSummary = {
  formDefinitionId?: string | null;
  id: string;
  status: string;
};

export type FormDetailViewProps = {
  application: ApplicationDetailViewModel;
  definition: FormDefinitionDetail | null;
  fields: ApplicationFormField[];
  relatedApplications: ApplicationSummary[];
  spaceId: string;
  publicApplicationUrlPath: string;
  editHref: string;
  descriptionAction: (formData: FormData) => Promise<void>;
};
