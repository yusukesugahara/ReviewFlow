import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountView } from "@/app/(authorized)/account/view";

jest.mock("@/app/(authorized)/account/actions", () => ({
  updateAccountEmailAction: jest.fn(),
  updateAccountPasswordAction: jest.fn(),
  updateAccountProfileAction: jest.fn(),
}));

const user = {
  id: "user-1",
  email: "member@example.com",
  name: "Member User",
  tenantId: "tenant-1",
  roles: ["tenant_user"],
};

describe("AccountView", () => {
  // テスト内容: アカウント詳細を表示し、アクションボタンから編集メニューを表示できることを確認する
  it("renders account details and reveals account actions", async () => {
    const userEventApi = userEvent.setup();
    render(
      <AccountView user={user} />,
    );

    expect(screen.queryByRole("heading", { name: "アカウント" })).not.toBeInTheDocument();
    expect(
      screen.queryByText("ログイン中の名前、メールアドレス、パスワードを管理します。"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アカウント詳細" })).toBeInTheDocument();
    expect(screen.getByText("Member User")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText("テナントユーザ")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "プロフィールを編集" })).not.toBeInTheDocument();

    await userEventApi.click(screen.getByRole("button", { name: "アカウント操作" }));

    expect(screen.getByRole("menuitem", { name: "プロフィールを編集" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "メールアドレスを編集" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "パスワードを変更" })).toBeInTheDocument();
  });

  // テスト内容: プロフィール編集をモーダルで開き、背景クリックで閉じられることを確認する
  it("opens the profile edit modal from account actions", async () => {
    const userEventApi = userEvent.setup();
    render(<AccountView user={user} />);

    await userEventApi.click(screen.getByRole("button", { name: "アカウント操作" }));
    await userEventApi.click(screen.getByRole("menuitem", { name: "プロフィールを編集" }));

    expect(screen.getByRole("heading", { name: "プロフィールを編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("名前")).toHaveValue("Member User");
    expect(screen.queryByLabelText("メールアドレス")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();

    const overlay = screen.getByRole("dialog").previousElementSibling;
    expect(overlay).not.toBeNull();
    await userEventApi.click(overlay as Element);
    expect(screen.queryByRole("heading", { name: "プロフィールを編集" })).not.toBeInTheDocument();
  });

  // テスト内容: メールアドレス編集を専用モーダルで開けることを確認する
  it("opens the email edit modal from account actions", async () => {
    const userEventApi = userEvent.setup();
    render(<AccountView user={user} />);

    await userEventApi.click(screen.getByRole("button", { name: "アカウント操作" }));
    await userEventApi.click(screen.getByRole("menuitem", { name: "メールアドレスを編集" }));

    expect(screen.getByRole("heading", { name: "メールアドレスを編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("member@example.com");
    expect(screen.getByRole("button", { name: "確認メールを送信" })).toBeEnabled();
  });

  // テスト内容: パスワード変更をモーダルで開けることを確認する
  it("opens the password edit modal from account actions", async () => {
    const userEventApi = userEvent.setup();
    render(<AccountView user={user} />);

    await userEventApi.click(screen.getByRole("button", { name: "アカウント操作" }));
    await userEventApi.click(screen.getByRole("menuitem", { name: "パスワードを変更" }));

    expect(screen.getByRole("heading", { name: "パスワードを変更" })).toBeInTheDocument();
    expect(screen.getByLabelText("現在のパスワード")).toBeRequired();
    expect(screen.getByLabelText("新しいパスワード")).toBeRequired();
    expect(screen.getByLabelText("新しいパスワード（確認）")).toBeRequired();
    expect(screen.getByRole("button", { name: "変更" })).toBeEnabled();
  });

  // テスト内容: プロフィール更新エラー時はプロフィールモーダルを自動で開くことを確認する
  it("opens the profile modal when redirected with a profile error", () => {
    render(
      <AccountView
        user={user}
        profileError="名前を確認してください"
      />,
    );

    expect(screen.getByRole("heading", { name: "プロフィールを編集" })).toBeInTheDocument();
    expect(screen.getByText("名前を確認してください")).toBeInTheDocument();
  });

  // テスト内容: メール更新エラー時はメールモーダルを自動で開くことを確認する
  it("opens the email modal when redirected with an email error", () => {
    render(
      <AccountView
        user={user}
        emailError="このメールアドレスは既に使用されています"
      />,
    );

    expect(screen.getByRole("heading", { name: "メールアドレスを編集" })).toBeInTheDocument();
    expect(
      screen.getByText("このメールアドレスは既に使用されています"),
    ).toBeInTheDocument();
  });
});
