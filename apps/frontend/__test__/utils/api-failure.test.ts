import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";

describe("api failure helpers", () => {
  // テスト内容: API failure の shape を判定できることを確認する
  it("detects API failure shapes", () => {
    expect(isApiFailure({ status: 400, body: { message: "bad request" } })).toBe(true);
    expect(isApiFailure({ status: "400" })).toBe(false);
    expect(isApiFailure(null)).toBe(false);
  });

  // テスト内容: string / string[] の message を取り出せることを確認する
  it("extracts messages from response bodies", () => {
    expect(errorMessageFromBody({ message: "入力内容を確認してください" })).toBe(
      "入力内容を確認してください",
    );
    expect(errorMessageFromBody({ message: ["a", "b"] })).toBe("a, b");
  });

  // テスト内容: message がない場合は fallback を返すことを確認する
  it("returns fallback when no usable message exists", () => {
    expect(errorMessageFromBody({ message: "" }, "fallback")).toBe("fallback");
    expect(errorMessageFromBody("invalid", "fallback")).toBe("fallback");
  });
});
