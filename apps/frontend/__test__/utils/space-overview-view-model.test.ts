import { buildSpaceOverviewViewModel } from "@/app/(authorized)/space/[spaceId]/_view-models/space-overview-view-model";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import type { AuditLogItem, GroupMemberSummary } from "@/lib/schema";

const applications: ApplicationRow[] = [
  {
    id: "setup-1",
    groupId: "space-1",
    status: "published",
    formDefinitionId: "form-1",
    formDefinitionName: "住民票交付申請",
    applicationName: "住民票交付申請",
    applicantEmail: "",
    currentStepAssigneeUserIds: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "app-1",
    groupId: "space-1",
    status: "in_review",
    formDefinitionId: "form-1",
    formDefinitionName: "住民票交付申請",
    applicationName: "住民票申請 A",
    applicantEmail: "applicant@example.com",
    currentStepAssigneeUserIds: ["user-1"],
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  },
  {
    id: "app-2",
    groupId: "space-1",
    status: "returned",
    formDefinitionId: "form-1",
    formDefinitionName: "住民票交付申請",
    applicationName: "住民票申請 B",
    applicantEmail: "returned@example.com",
    currentStepAssigneeUserIds: [],
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
  },
];

const formDefinitions: FormDefinitionRow[] = [
  {
    id: "form-1",
    groupId: "space-1",
    name: "住民票交付申請",
    status: "published",
    fields: [{ id: "field-1" }],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
];

const members = [
  { id: "member-1", groupId: "space-1", userId: "user-1" },
  { id: "member-2", groupId: "space-1", userId: "user-2" },
] as GroupMemberSummary[];

const auditLogs: AuditLogItem[] = [
  {
    id: "audit-1",
    groupId: "space-1",
    actorType: "user",
    actorEmailSnapshot: "admin@example.com",
    actionType: "application.approved",
    targetType: "application",
    targetId: "app-1",
    applicationId: "app-1",
    statusFrom: "in_review",
    statusTo: "approved",
    createdAt: "2026-06-06T00:00:00.000Z",
  },
];

describe("space overview view model", () => {
  it("builds operational counts and recent items for a space", () => {
    const viewModel = buildSpaceOverviewViewModel({
      applications,
      auditLogs,
      canManageSpace: true,
      canViewAuditLogs: true,
      currentUserId: "user-1",
      formDefinitions,
      members,
      space: {
        id: "space-1",
        name: "市民課",
        description: "住民票や戸籍に関する申請を扱います。",
        currentUserRole: "admin",
      },
    });

    expect(viewModel.stats).toEqual({
      memberCount: 2,
      myNeedsActionCount: 1,
      needsActionCount: 1,
      publishedFormCount: 1,
      returnedCount: 1,
      totalApplications: 2,
    });
    expect(viewModel.roleLabel).toBe("テナント管理者");
    expect(viewModel.recentApplications[0]).toMatchObject({
      href: "/space/space-1/submissions/app-1?definitionId=form-1",
      name: "住民票申請 A",
      statusLabel: "レビュー中",
    });
    expect(viewModel.publishedForms[0]).toMatchObject({
      fieldCount: 1,
      href: "/space/space-1/applications/setup-1?definitionId=form-1&view=form",
      name: "住民票交付申請",
    });
    expect(viewModel.recentAuditRows[0]?.display.actionLabel).toBe("申請を承認");
  });

  it("hides member count and audit rows when the user cannot view them", () => {
    const viewModel = buildSpaceOverviewViewModel({
      applications,
      auditLogs,
      canManageSpace: false,
      canViewAuditLogs: false,
      currentUserId: null,
      formDefinitions,
      members,
      space: {
        id: "space-1",
        name: "市民課",
        description: null,
        currentUserRole: "user",
      },
    });

    expect(viewModel.stats.memberCount).toBeNull();
    expect(viewModel.recentAuditRows).toEqual([]);
    expect(viewModel.roleLabel).toBe("スペースユーザ");
  });
});
