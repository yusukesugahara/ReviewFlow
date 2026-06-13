import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceUsersTable } from "@/app/(authorized)/space/users/_components/space-users-table";

jest.mock("@/app/(authorized)/space/users/actions", () => ({
  removeSpaceMemberAction: jest.fn(),
  updateSpaceMemberRoleAction: jest.fn(),
}));

const members = [
  {
    id: "member-1",
    userId: "user-current",
    email: "me@example.com",
    name: "Current User",
    role: "admin" as const,
    createdAtLabel: "2026/06/06",
  },
  {
    id: "member-2",
    userId: "user-other",
    email: "other@example.com",
    name: null,
    role: "user" as const,
    createdAtLabel: "2026/06/05",
  },
];

const removeMemberAction = jest.fn();
const updateMemberRoleAction = jest.fn();

describe("SpaceUsersTable", () => {
  beforeEach(() => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 40,
      height: 32,
      left: 200,
      right: 240,
      top: 8,
      width: 40,
      x: 200,
      y: 8,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // テスト内容: メンバー一覧が表示され、操作メニューからロール変更ダイアログが開くことを確認する
  it("renders members and opens the role change dialog from the action menu", async () => {
    const user = userEvent.setup();
    render(
      <SpaceUsersTable
        currentUserId="user-current"
        members={members}
        removeMemberAction={removeMemberAction}
        spaceId="space-1"
        updateMemberRoleAction={updateMemberRoleAction}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Current User")).toBeInTheDocument();
    expect(screen.getByText("other@example.com")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("スペース管理者")).toBeInTheDocument();
    expect(screen.getByText("スペースユーザ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "other@example.com の操作" }));
    await user.click(screen.getByRole("menuitem", { name: "スペースロールを変更" }));

    expect(screen.getByRole("heading", { name: "スペースロールを変更" })).toBeInTheDocument();
    expect(screen.getByText("other@example.com のスペースロールを変更します。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  // テスト内容: 自分自身の削除は非表示で、他メンバーの削除は表示されることを確認する
  it("hides delete for the current user and shows delete for other members", async () => {
    const user = userEvent.setup();
    render(
      <SpaceUsersTable
        currentUserId="user-current"
        members={members}
        removeMemberAction={removeMemberAction}
        spaceId="space-1"
        updateMemberRoleAction={updateMemberRoleAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "me@example.com の操作" }));
    expect(screen.getByRole("menuitem", { name: "スペースロールを変更" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "削除" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "メニューを閉じる" }));
    await user.click(screen.getByRole("button", { name: "other@example.com の操作" }));
    const menu = screen.getByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: "削除" }));

    expect(
      screen.getByRole("heading", { name: "スペースメンバーを削除しますか" }),
    ).toBeInTheDocument();
    expect(screen.getByText("other@example.com をこのスペースから削除します。")).toBeInTheDocument();
  });
});
