import { render, screen } from "@testing-library/react";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea", () => {
  // テスト内容: テキストエリアが共通フォームスタイルと追加クラスで表示されることを確認する
  it("renders a textarea with consistent form styling and custom classes", () => {
    render(
      <Textarea
        aria-label="備考"
        className="resize-none"
        placeholder="入力してください"
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "備考" });
    expect(textarea).toHaveAttribute("placeholder", "入力してください");
    expect(textarea).toHaveClass("min-h-[60px]", "rounded-md", "resize-none");
  });
});
