import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  // テスト内容: ボタンの子要素表示と共通ホバー処理を確認する
  it("renders children and uses the shared hover treatment", () => {
    render(<Button>保存</Button>);

    const button = screen.getByRole("button", { name: "保存" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("h-10", "hover:shadow-md");
  });

  // テスト内容: 各ボタンサイズが共通の高さ40pxを保つことを確認する
  it("keeps every button size at the shared 40px height", () => {
    expect(buttonVariants({ size: "default" })).toContain("h-10");
    expect(buttonVariants({ size: "sm" })).toContain("h-10");
    expect(buttonVariants({ size: "lg" })).toContain("h-10");
    expect(buttonVariants({ size: "icon" })).toContain("h-10");
  });
});
