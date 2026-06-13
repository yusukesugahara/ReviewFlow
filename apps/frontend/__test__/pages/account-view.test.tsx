import { render, screen } from "@testing-library/react";
import { AccountView } from "@/app/(authorized)/account/view";

jest.mock("@/app/(authorized)/account/actions", () => ({
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
  // テスト内容: 自分のプロフィールとパスワード変更フォームが表示されることを確認する
  it("renders account profile and password forms", () => {
    render(
      <AccountView
        user={user}
        profileError="このメールアドレスは既に使用されています"
        passwordError="現在のパスワードが違います"
      />,
    );

    expect(screen.getByRole("heading", { name: "アカウント" })).toBeInTheDocument();
    expect(screen.getByLabelText("名前")).toHaveValue("Member User");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue(
      "member@example.com",
    );
    expect(
      screen.getByText("このメールアドレスは既に使用されています"),
    ).toBeInTheDocument();
    expect(screen.getByText("現在のパスワードが違います")).toBeInTheDocument();
    expect(screen.getByLabelText("現在のパスワード")).toBeRequired();
    expect(screen.getByLabelText("新しいパスワード")).toBeRequired();
    expect(screen.getByLabelText("新しいパスワード（確認）")).toBeRequired();
    expect(screen.getByRole("button", { name: "プロフィールを保存" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "パスワードを変更" })).toBeEnabled();
  });
});
