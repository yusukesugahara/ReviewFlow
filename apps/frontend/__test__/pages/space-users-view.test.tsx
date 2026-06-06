import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceUsersErrorView, SpaceUsersView } from "@/app/(authorized)/space/users/view";

jest.mock("@/app/(authorized)/space/users/actions", () => ({
  addSpaceMemberAction: jest.fn(),
}));

jest.mock("@/app/(authorized)/space/users/space-users-table", () => ({
  SpaceUsersTable: ({ members }: { members: Array<{ email: string }> }) => (
    <table>
      <tbody>
        {members.map((member) => (
          <tr key={member.email}>
            <td>{member.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const member = {
  id: "member-1",
  groupId: "space-1",
  userId: "user-1",
  email: "member@example.com",
  name: "Member",
  role: "user" as const,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("SpaceUsersView", () => {
  // テスト内容: メンバー一覧が表示され、テナント管理者は追加モーダルを開けることを確認する
  it("renders members and opens the add member modal for tenant admins", async () => {
    const user = userEvent.setup();
    render(
      <SpaceUsersView
        availableUsers={[
          { id: "user-2", email: "new@example.com", name: "New User" },
        ]}
        currentUserId="user-1"
        isTenantAdmin
        members={[member]}
        spaceId="space-1"
      />,
    );

    expect(screen.getByText("1名のユーザーが参加しています")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ユーザーをスペースに追加" }));

    expect(
      screen.getByRole("heading", { name: "ユーザーをスペースに追加" }),
    ).toBeInTheDocument();
    expect(screen.getByText("追加するユーザーを選択")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "追加" })).toBeEnabled();
  });

  // テスト内容: 管理者以外にはメンバー追加操作が表示されないことを確認する
  it("hides the add member action from non-admin users", () => {
    render(
      <SpaceUsersView
        availableUsers={[]}
        currentUserId="user-1"
        isTenantAdmin={false}
        members={[]}
        spaceId="space-1"
      />,
    );

    expect(screen.queryByRole("button", { name: "ユーザーをスペースに追加" })).not.toBeInTheDocument();
    expect(screen.getByText("ユーザーが見つかりません")).toBeInTheDocument();
  });

  // テスト内容: 追加可能ユーザーがない場合に追加操作が無効化されることを確認する
  it("disables add controls when no users are available", async () => {
    const user = userEvent.setup();
    render(
      <SpaceUsersView
        availableUsers={[]}
        currentUserId="user-1"
        isTenantAdmin
        members={[]}
        spaceId="space-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "ユーザーをスペースに追加" }));

    expect(screen.getByText("追加できるユーザーがいません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });
});

describe("SpaceUsersErrorView", () => {
  // テスト内容: 任意のステータスメッセージが表示されることを確認する
  it("renders optional status", () => {
    render(<SpaceUsersErrorView status={404} />);

    expect(screen.getByText(/ユーザー一覧の取得に失敗しました/)).toBeInTheDocument();
    expect(screen.getByText(/status: 404/)).toBeInTheDocument();
  });
});
