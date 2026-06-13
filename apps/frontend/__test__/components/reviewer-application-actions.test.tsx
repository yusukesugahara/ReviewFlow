import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewerApplicationActions } from "@/components/applications/actions/reviewer-application-actions";

const approveAction = jest.fn(async () => undefined);
const rejectAction = jest.fn(async () => undefined);

describe("ReviewerApplicationActions", () => {
  // テスト内容: レビュー操作が利用できない場合に何も表示されないことを確認する
  it("renders nothing when reviewer actions are unavailable", () => {
    const { container } = render(
      <ReviewerApplicationActions
        capabilities={{
          canApproveApplication: false,
          canRejectApplication: false,
        }}
        approveAction={approveAction}
        rejectAction={rejectAction}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // テスト内容: 承認ダイアログが開くことを確認する
  it("opens an approval dialog", async () => {
    const user = userEvent.setup();
    render(
      <ReviewerApplicationActions
        capabilities={{
          canApproveApplication: true,
          canRejectApplication: true,
        }}
        approveAction={approveAction}
        rejectAction={rejectAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "承認する" }));

    expect(screen.getByRole("heading", { name: "申請を承認しますか" })).toBeInTheDocument();
    expect(screen.getByLabelText("コメント（任意）")).toHaveAttribute(
      "placeholder",
      "承認コメント",
    );
  });

  // テスト内容: 却下ダイアログを開閉できることを確認する
  it("opens and closes a rejection dialog", async () => {
    const user = userEvent.setup();
    render(
      <ReviewerApplicationActions
        capabilities={{
          canApproveApplication: true,
          canRejectApplication: true,
        }}
        approveAction={approveAction}
        rejectAction={rejectAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "却下する" }));

    expect(screen.getByRole("heading", { name: "申請を却下しますか" })).toBeInTheDocument();
    expect(screen.getByLabelText("コメント（任意）")).toHaveAttribute(
      "placeholder",
      "却下理由",
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByRole("heading", { name: "申請を却下しますか" })).not.toBeInTheDocument();
  });
});
