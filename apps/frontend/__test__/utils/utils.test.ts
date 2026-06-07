import { cn } from "@/lib/utils";

describe("cn", () => {
  // テスト内容: 条件付きクラスを結合しTailwind競合を解決することを確認する
  it("merges conditional classes and resolves tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
