import { render, screen } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("Tabs", () => {
  // テスト内容: 選択状態付きのタブナビゲーションが表示されることを確認する
  it("renders tab navigation with selected state", () => {
    render(
      <Tabs>
        <TabsList aria-label="表示切り替え">
          <TabsTrigger active href="/active">
            有効
          </TabsTrigger>
          <TabsTrigger href="/archived">削除済み</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(screen.getByRole("tablist", { name: "表示切り替え" })).toHaveClass(
      "h-10",
      "rounded-lg",
    );
    expect(screen.getByRole("tab", { name: "有効" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "有効" })).toHaveClass("bg-slate-900");
    expect(screen.getByRole("tab", { name: "削除済み" })).not.toHaveAttribute(
      "aria-selected",
    );
    expect(screen.getByRole("tab", { name: "削除済み" })).toHaveClass("text-slate-600");
  });
});
