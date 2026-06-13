import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { ApplicationEmptyState } from "@/components/applications/list/application-empty-state";

describe("ApplicationEmptyState", () => {
  // テスト内容: メッセージと任意のアクションが表示されることを確認する
  it("renders the message and optional action", () => {
    render(
      <ApplicationEmptyState
        message="申請フォームはまだありません"
        action={<Button>作成</Button>}
      />,
    );

    expect(screen.getByText("申請フォームはまだありません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });
});
