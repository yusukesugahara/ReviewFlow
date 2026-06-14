import { render, screen } from "@testing-library/react";
import { AdminSpacesView } from "@/app/(authorized)/admin/spaces/view";

jest.mock("@/app/(authorized)/admin/spaces/actions", () => ({
  addMemberAction: jest.fn(),
  createSpaceAction: jest.fn(),
  inviteSpaceMemberAction: jest.fn(),
  leaveSpaceAction: jest.fn(),
  removeMemberAction: jest.fn(),
  removeSpaceAction: jest.fn(),
  updateMemberRoleAction: jest.fn(),
  updateSpaceAction: jest.fn(),
}));

jest.mock("@/app/(authorized)/admin/spaces/_components/space-management-header", () => ({
  SpaceManagementHeader: ({
    canCreateSpace,
    users,
  }: {
    canCreateSpace: boolean;
    users: unknown[];
  }) => (
    <div data-testid="space-management-header">
      {canCreateSpace ? "can-create" : "cannot-create"}:{users.length}
    </div>
  ),
}));

jest.mock("@/app/(authorized)/admin/spaces/_components/space-list", () => ({
  SpaceList: ({
    currentUserId,
    isSystemAdmin,
    spaces,
  }: {
    currentUserId: string | null;
    isSystemAdmin: boolean;
    spaces: Array<{ group: { name: string } }>;
  }) => (
    <div data-testid="space-list">
      {currentUserId}:{isSystemAdmin ? "system-admin" : "tenant-admin"}:
      {spaces.map((space) => space.group.name).join(",")}
    </div>
  ),
}));

const users = [
  {
    id: "user-1",
    email: "member@example.com",
    name: "Member",
    role: "tenant_user",
    isActive: true,
    createdAt: "2026-06-06T00:00:00.000Z",
  },
];

const spaces = [
  {
    group: {
      id: "space-1",
      name: "営業部",
      description: "営業用スペース",
      isActive: true,
      currentUserRole: "admin" as const,
      createdByUserId: "user-1",
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
    },
    members: [],
    addableUsers: [],
    canManageSpace: true,
  },
];

describe("AdminSpacesView", () => {
  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    render(
      <AdminSpacesView
        canCreateSpace
        currentUserId="user-1"
        fetchErrorStatus={500}
        isSystemAdmin={false}
        spaces={[]}
        users={[]}
      />,
    );

    expect(
      screen.getByText("スペース管理情報の取得に失敗しました（status: 500）"),
    ).toBeInTheDocument();
  });

  // テスト内容: フォームエラー、APIエラー、ヘッダー、空状態が表示されることを確認する
  it("renders form errors, API errors, header, and empty state", () => {
    render(
      <AdminSpacesView
        canCreateSpace={false}
        currentUserId="user-1"
        error="スペース一覧の取得に失敗しました"
        formError="スペース名を入力してください"
        isSystemAdmin={false}
        spaces={[]}
        users={users}
      />,
    );

    expect(screen.getByTestId("space-management-header")).toHaveTextContent(
      "cannot-create:1",
    );
    expect(screen.getByText("スペース名を入力してください")).toBeInTheDocument();
    expect(screen.getByText("スペース一覧の取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("スペースが見つかりません")).toBeInTheDocument();
  });

  // テスト内容: スペース情報と現在の権限が一覧へ渡されることを確認する
  it("passes spaces and current permissions to the space list", () => {
    render(
      <AdminSpacesView
        canCreateSpace
        currentUserId="user-1"
        isSystemAdmin
        spaces={spaces}
        users={users}
      />,
    );

    expect(screen.getByTestId("space-management-header")).toHaveTextContent("can-create:1");
    expect(screen.getByTestId("space-list")).toHaveTextContent(
      "user-1:system-admin:営業部",
    );
  });
});
