import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import type { AuditLogItem, GroupMemberSummary, GroupSummary } from "@/lib/schema";

export type SpaceOverviewPageProps = {
  params: Promise<{ spaceId: string }>;
};

export type SpaceOverviewSpace = Pick<
  GroupSummary,
  "currentUserRole" | "description" | "id" | "name"
>;

export type SpaceOverviewPageData = {
  applications: ApplicationRow[];
  auditLogs: AuditLogItem[];
  canManageSpace: boolean;
  canViewAuditLogs: boolean;
  currentUserId: string | null;
  formDefinitions: FormDefinitionRow[];
  members: GroupMemberSummary[];
  space: SpaceOverviewSpace;
};

export type SpaceOverviewViewProps = {
  applications: ApplicationRow[];
  auditLogs: AuditLogItem[];
  canManageSpace: boolean;
  canViewAuditLogs: boolean;
  currentUserId: string | null;
  fetchErrorStatus?: number;
  formDefinitions: FormDefinitionRow[];
  members: GroupMemberSummary[];
  space: SpaceOverviewSpace | null;
  spaceId: string;
};
