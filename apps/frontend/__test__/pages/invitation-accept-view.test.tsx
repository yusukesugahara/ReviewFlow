import { render, screen } from "@testing-library/react";
import { InvitationAcceptView } from "@/app/(authorized)/invitations/accept/view";

jest.mock("@/app/(authorized)/invitations/accept/actions", () => ({
  acceptInvitationAction: jest.fn(),
}));

describe("InvitationAcceptView", () => {
  // テスト内容: 招待受諾フォームに初期値が表示されることを確認する
  it("renders the invitation acceptance form with preset values", () => {
    render(
      <InvitationAcceptView
        formError="招待トークンが無効です"
        next="/space"
        presetToken="invite-token"
      />,
    );

    expect(screen.getByRole("heading", { name: "招待受諾" })).toBeInTheDocument();
    expect(screen.getByText("招待トークンが無効です")).toBeInTheDocument();
    expect(screen.getByLabelText(/招待トークン/)).toHaveValue("invite-token");
    expect(screen.getByDisplayValue("/space")).toHaveAttribute("name", "next");
    expect(screen.getByLabelText("表示名（任意）")).toHaveAttribute(
      "placeholder",
      "山田 太郎",
    );
    expect(screen.getByPlaceholderText("8文字以上のパスワード")).toHaveAttribute(
      "minlength",
      "8",
    );
    expect(
      screen.getByRole("button", { name: "受諾してログインへ進む" }),
    ).toBeInTheDocument();
  });
});
