import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import type { GroupMemberSummary, GroupSummary } from "@/lib/schema";

export type SpaceOverviewPageProps = {
  params: Promise<{ spaceId: string }>;
};

export type SpaceOverviewSpace = Pick<
  GroupSummary,
  "currentUserRole" | "description" | "id" | "name"
>;

export type SpaceOverviewPageData = {
  applications: ApplicationRow[];
  canManageSpace: boolean;
  currentUserId: string | null;
  formDefinitions: FormDefinitionRow[];
  isTenantAdmin: boolean;
  members: GroupMemberSummary[];
  space: SpaceOverviewSpace;
};

export type SpaceOverviewViewProps = {
  applications: ApplicationRow[];
  canManageSpace: boolean;
  currentUserId: string | null;
  fetchErrorStatus?: number;
  formDefinitions: FormDefinitionRow[];
  isTenantAdmin: boolean;
  members: GroupMemberSummary[];
  space: SpaceOverviewSpace | null;
  spaceId: string;
};
