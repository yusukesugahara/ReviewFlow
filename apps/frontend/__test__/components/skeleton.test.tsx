import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  // テスト内容: パルス表示のプレースホルダーと追加属性が保持されることを確認する
  it("renders a pulse placeholder and preserves custom attributes", () => {
    render(<Skeleton aria-label="読み込み中" className="h-10 w-full" />);

    expect(screen.getByLabelText("読み込み中")).toHaveClass(
      "animate-pulse",
      "rounded-md",
      "h-10",
      "w-full",
    );
  });
});
