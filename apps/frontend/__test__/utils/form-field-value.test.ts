import {
  normalizeFieldOptions,
  renderFieldValue,
} from "@/lib/form-field-value";

describe("form-field-value", () => {
  // テスト内容: 文字列形式とオブジェクト形式の選択肢を正規化することを確認する
  it("normalizes string and object options", () => {
    expect(
      normalizeFieldOptions([
        "a",
        { value: "b", label: "B" },
        { value: "ignored" },
        null,
      ]),
    ).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "B" },
    ]);
  });

  // テスト内容: 選択式とチェックボックスの値を選択肢ラベルで表示することを確認する
  it("renders option labels for select and checkbox values", () => {
    const options = [
      { value: "admin", label: "管理者" },
      { value: "user", label: "メンバー" },
    ];

    expect(renderFieldValue({ fieldType: "select", options }, "admin")).toBe(
      "管理者",
    );
    expect(
      renderFieldValue({ fieldType: "checkbox", options }, ["admin", "user"]),
    ).toBe("管理者, メンバー");
  });

  // テスト内容: 特殊フィールド種別と空値の表示を確認する
  it("renders special field types and empty values", () => {
    expect(renderFieldValue({ fieldType: "consent" }, true)).toBe("同意済み");
    expect(renderFieldValue({ fieldType: "consent" }, false)).toBe("未同意");
    expect(renderFieldValue({ fieldType: "description" }, "ignored")).toBe("-");
    expect(renderFieldValue({ fieldType: "text" }, null)).toBe("-");
  });
});
