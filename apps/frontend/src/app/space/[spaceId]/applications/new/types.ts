import type { ApprovalAssigneeOption } from "@/app/space/_components/application-setup-draft-form";
import type { GroupMemberSummary, GroupSummary } from "@/lib/schema";

export type SpaceNewApplicationPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{
    publishedGroupId?: string;
    publishedFormDefinitionId?: string;
    setupError?: string;
    setupErrorDetail?: string;
    setupStatus?: string;
  }>;
};

export type SpaceNewApplicationGroup = GroupSummary;

export type SpaceNewApplicationMember = Omit<GroupMemberSummary, "name"> & {
  name: string | null;
};

export type SpaceNewApplicationViewProps = {
  assignees: ApprovalAssigneeOption[];
  canManageSpace: boolean;
  newApplicationHref: string;
  publishedFormDefinitionId: string | null;
  publishedGroupId: string | null;
  setupErrorDetail?: string;
  setupError?: string;
  setupStatus?: string;
  spaceId: string;
};
