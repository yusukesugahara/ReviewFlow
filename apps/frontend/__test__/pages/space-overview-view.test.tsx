import { render, screen } from "@testing-library/react";
import { SpaceOverviewView } from "@/app/(authorized)/space/[spaceId]/view";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import type { GroupMemberSummary } from "@/lib/schema";

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

const baseProps = {
  applications,
  canManageSpace: true,
  currentUserId: "user-1",
  formDefinitions,
  isTenantAdmin: true,
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
    expect(screen.queryByText("最近の監査ログ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CSV出力" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "申請フォームを新規作成" }),
    ).toHaveAttribute("href", "/space/space-1/applications/new");
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
        isTenantAdmin={false}
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
        canManageSpace={false}
        currentUserId={null}
        fetchErrorStatus={404}
        formDefinitions={[]}
        isTenantAdmin={false}
        members={[]}
        space={null}
        spaceId="missing-space"
      />,
    );

    expect(screen.getByText("スペース概要の取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText(/status: 404/)).toBeInTheDocument();
  });
});
