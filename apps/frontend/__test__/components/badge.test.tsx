import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "@/components/ui/badge";

describe("Badge", () => {
  // テスト内容: 指定したバリアントでバッジが表示されることを確認する
  it("renders with the requested variant", () => {
    render(<Badge variant="destructive">却下</Badge>);

    expect(screen.getByText("却下")).toHaveClass("bg-destructive");
  });

  // テスト内容: 再利用できるバリアントクラスが返ることを確認する
  it("exposes variant classes for reuse", () => {
    expect(badgeVariants({ variant: "outline" })).toContain("text-foreground");
  });
});
