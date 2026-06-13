import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReturnApplicationConfirmButton } from "@/components/applications/actions/return-application-confirm-button";

describe("ReturnApplicationConfirmButton", () => {
  // テスト内容: 確認ダイアログを開閉できることを確認する
  it("opens and closes the confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<ReturnApplicationConfirmButton formId="return-form" />);

    await user.click(screen.getByRole("button", { name: "選択した項目を差し戻す" }));

    expect(
      screen.getByRole("heading", { name: "選択した項目を差し戻しますか" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "差し戻す" })).toHaveAttribute(
      "form",
      "return-form",
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(
      screen.queryByRole("heading", { name: "選択した項目を差し戻しますか" }),
    ).not.toBeInTheDocument();
  });
});
