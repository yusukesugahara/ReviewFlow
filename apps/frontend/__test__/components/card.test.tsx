import { render, screen } from "@testing-library/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

describe("Card", () => {
  // テスト内容: カード各セクションが共通スタイルで表示されることを確認する
  it("renders the card sections with the shared card styling", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>カードタイトル</CardTitle>
          <CardDescription>カード説明</CardDescription>
        </CardHeader>
        <CardContent>カード本文</CardContent>
        <CardFooter>カードフッター</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveClass("rounded-2xl", "border-slate-200");
    expect(screen.getByTestId("header")).toHaveClass("p-7");
    expect(screen.getByRole("heading", { name: "カードタイトル" })).toHaveClass(
      "font-semibold",
    );
    expect(screen.getByText("カード説明")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("カード本文")).toHaveClass("p-7", "pt-0");
    expect(screen.getByText("カードフッター")).toHaveClass("flex", "items-center");
  });
});
