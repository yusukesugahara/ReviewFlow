import { render, screen } from "@testing-library/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("Alert", () => {
  // テスト内容: 警告内容が危険表示スタイルで表示されることを確認する
  it("renders alert content with destructive styling", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>取得に失敗しました</AlertTitle>
        <AlertDescription>再読み込みしてください。</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("border-red-200", "bg-red-50");
    expect(screen.getByText("取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("再読み込みしてください。")).toBeInTheDocument();
  });
});
