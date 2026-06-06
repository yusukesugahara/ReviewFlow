import {
  errorMessageFromBody,
  isApiFailure,
  isDynamicFormField,
} from "@/app/(authorized)/apply/form/helpers";

describe("apply form helpers", () => {
  // テスト内容: 通信失敗オブジェクトの形を判定できることを確認する
  it("detects API failure shapes", () => {
    expect(isApiFailure({ status: 404, body: { message: "not found" } })).toBe(true);
    expect(isApiFailure({ status: "404", body: {} })).toBe(false);
    expect(isApiFailure(null)).toBe(false);
  });

  // テスト内容: レスポンス本文から利用可能なメッセージを取り出せることを確認する
  it("extracts a usable message from response bodies", () => {
    expect(errorMessageFromBody({ message: "入力内容を確認してください" })).toBe(
      "入力内容を確認してください",
    );
    expect(errorMessageFromBody({ message: "" })).toBe("submit_failed");
    expect(errorMessageFromBody("invalid")).toBe("submit_failed");
  });

  // テスト内容: 動的フォーム項目の行を判定できることを確認する
  it("detects dynamic form field rows", () => {
    expect(
      isDynamicFormField({
        id: "field-1",
        fieldKey: "amount",
        label: "金額",
        fieldType: "number",
      }),
    ).toBe(true);
    expect(
      isDynamicFormField({
        id: "field-1",
        fieldKey: "amount",
        label: "金額",
      }),
    ).toBe(false);
  });
});
