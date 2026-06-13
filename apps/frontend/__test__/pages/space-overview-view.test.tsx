import { render, screen } from "@testing-library/react";
import { SpaceOverviewView } from "@/app/(authorized)/space/[spaceId]/view";
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
];

const formDefinitions: FormDefinitionRow[] = [
  {
    id: "form-1",
    groupId: "space-1",
    name: "住民票交付申請",
    status: "published",
    fields: [{ id: "field-1" }, { id: "field-2" }],
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

const baseProps = {
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
    currentUserRole: "admin" as const,
  },
  spaceId: "space-1",
};

describe("SpaceOverviewView", () => {
  it("renders the space overview entry point", () => {
    render(<SpaceOverviewView {...baseProps} />);

    expect(screen.getByRole("heading", { name: "市民課" })).toBeInTheDocument();
    expect(screen.getByText("住民票や戸籍に関する申請を扱います。")).toBeInTheDocument();
    expect(screen.getByText("テナント管理者")).toBeInTheDocument();
    expect(screen.getAllByText("対応が必要").length).toBeGreaterThan(0);
    expect(screen.getByText("あなたの担当")).toBeInTheDocument();
    expect(screen.getByText("住民票申請 A")).toBeInTheDocument();
    expect(screen.getByText("applicant@example.com")).toBeInTheDocument();
    expect(screen.getByText("レビュー中")).toBeInTheDocument();
    expect(screen.getAllByText("住民票交付申請").length).toBeGreaterThan(0);
    expect(screen.getByText("最近の監査ログ")).toBeInTheDocument();
    expect(screen.getByText("申請を承認")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "メンバー" })).toHaveAttribute(
      "href",
      "/space/users?spaceId=space-1",
    );
  });

  it("hides management-only sections for regular space users", () => {
    render(
      <SpaceOverviewView
        {...baseProps}
        canManageSpace={false}
        canViewAuditLogs={false}
        members={[]}
        space={{
          ...baseProps.space,
          currentUserRole: "user",
        }}
      />,
    );

    expect(screen.getByText("スペースユーザ")).toBeInTheDocument();
    expect(screen.queryByText("最近の監査ログ")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "メンバー" })).not.toBeInTheDocument();
  });

  it("renders fetch errors", () => {
    render(
      <SpaceOverviewView
        applications={[]}
        auditLogs={[]}
        canManageSpace={false}
        canViewAuditLogs={false}
        currentUserId={null}
        fetchErrorStatus={404}
        formDefinitions={[]}
        members={[]}
        space={null}
        spaceId="missing-space"
      />,
    );

    expect(screen.getByText("スペース概要の取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText(/status: 404/)).toBeInTheDocument();
  });
});
