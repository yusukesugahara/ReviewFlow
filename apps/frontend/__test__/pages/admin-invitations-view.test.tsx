import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminInvitationsView } from "@/app/(authorized)/admin/invitations/view";
import { TENANT_ROLES } from "@/lib/constants/roles";

jest.mock("@/app/(authorized)/admin/invitations/actions", () => ({
  createInvitationAction: jest.fn(),
  deleteUserAction: jest.fn(),
  restoreUserAction: jest.fn(),
}));

const activeUser = {
  id: "user-1",
  email: "active@example.com",
  name: "Active User",
  role: TENANT_ROLES.user,
  isActive: true,
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const deletedUser = {
  id: "user-2",
  email: "deleted@example.com",
  name: null,
  role: TENANT_ROLES.admin,
  isActive: false,
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
};

describe("AdminInvitationsView", () => {
  // テスト内容: フォームエラー時は招待モーダルを開き、送信結果、エラー、ユーザ一覧が表示されることを確認する
  it("opens invitation modal for form errors and renders sent summary, errors, and users", () => {
    render(
      <AdminInvitationsView
        currentUserId="current-user"
        email="invitee@example.com"
        error="招待の取得に失敗しました"
        expiresAt="2026-06-07T00:00:00.000Z"
        formError="メールアドレスを入力してください"
        role={TENANT_ROLES.admin}
        sent="1"
        userListError={undefined}
        users={[activeUser, deletedUser]}
      />,
    );

    expect(screen.getByRole("button", { name: "ユーザを招待" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "新しい招待を送信" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("招待の取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "招待メールを送信しました" })).toBeInTheDocument();
    expect(screen.getAllByText("テナント管理者").length).toBeGreaterThan(0);
    expect(screen.getByText("invitee@example.com")).toBeInTheDocument();
    expect(screen.getByText("2名のユーザが登録されています")).toBeInTheDocument();
    expect(screen.getByText("active@example.com")).toBeInTheDocument();
    expect(screen.getByText("deleted@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "復活" })).toBeInTheDocument();
  });

  // テスト内容: ユーザ一覧右上の招待アイコンから招待モーダルを開けることを確認する
  it("opens invitation modal from the user list action button", async () => {
    const user = userEvent.setup();
    render(
      <AdminInvitationsView
        currentUserId="current-user"
        sent={undefined}
        users={[activeUser]}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "新しい招待を送信" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ユーザを招待" }));

    expect(screen.getByRole("heading", { name: "新しい招待を送信" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(screen.getByRole("button", { name: "招待メールを送信" })).toBeInTheDocument();

    const overlay = screen.getByRole("dialog").previousElementSibling;
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);

    expect(
      screen.queryByRole("heading", { name: "新しい招待を送信" }),
    ).not.toBeInTheDocument();
  });

  // テスト内容: 自分自身の操作は表示せず、他ユーザの削除確認が開くことを確認する
  it("does not render actions for the current user and opens delete confirmation for others", async () => {
    const user = userEvent.setup();
    render(
      <AdminInvitationsView
        currentUserId="user-current"
        sent={undefined}
        users={[
          { ...activeUser, id: "user-current", email: "me@example.com" },
          { ...activeUser, id: "user-other", email: "other@example.com" },
        ]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "me@example.com を削除" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "other@example.com を削除" }));

    expect(screen.getByRole("heading", { name: "ユーザを削除しますか" })).toBeInTheDocument();
    expect(screen.getByText(/other@example.com を削除済みにします/)).toBeInTheDocument();
  });

  // テスト内容: ユーザ一覧のエラーと空状態が表示されることを確認する
  it("renders user list errors and empty states", () => {
    const { rerender } = render(
      <AdminInvitationsView
        currentUserId={null}
        sent={undefined}
        userListError="ユーザ一覧を取得できません"
        users={[]}
      />,
    );

    expect(screen.getByText("ユーザ一覧を取得できません")).toBeInTheDocument();

    rerender(
      <AdminInvitationsView currentUserId={null} sent={undefined} users={[]} />,
    );

    expect(screen.getByText("ユーザが見つかりません")).toBeInTheDocument();
  });
});
