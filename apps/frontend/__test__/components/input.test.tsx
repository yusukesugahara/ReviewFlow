import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  // テスト内容: 共通のフォームコントロール高さが使われることを確認する
  it("uses the shared form control height", () => {
    render(<Input aria-label="メール" type="email" />);

    expect(screen.getByRole("textbox", { name: "メール" })).toHaveClass("h-10");
  });
});
