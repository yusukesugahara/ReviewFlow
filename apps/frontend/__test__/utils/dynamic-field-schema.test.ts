import {
  isDynamicFormField,
  parseDynamicFormFieldsJson,
} from "@/components/applications/dynamic-fields/dynamic-field-schema";

describe("dynamic field schema", () => {
  // テスト内容: 動的フォーム項目 JSON を読み取り、不正項目を除外することを確認する
  it("parses valid dynamic form fields and skips invalid entries", () => {
    expect(
      parseDynamicFormFieldsJson(
        JSON.stringify([
          {
            id: "field-1",
            fieldKey: "amount",
            label: "金額",
            fieldType: "number",
            required: true,
            options: null,
          },
          {
            id: "field-2",
            fieldKey: "memo",
            label: "メモ",
            fieldType: "textarea",
          },
          { id: "bad", label: "fieldKey missing" },
        ]),
      ),
    ).toEqual([
      {
        id: "field-1",
        fieldKey: "amount",
        label: "金額",
        fieldType: "number",
        required: true,
        options: null,
      },
      {
        id: "field-2",
        fieldKey: "memo",
        label: "メモ",
        fieldType: "textarea",
        required: false,
      },
    ]);
  });

  // テスト内容: 非配列 JSON は空配列になり、不正 JSON は例外になることを確認する
  it("handles non-array and invalid JSON", () => {
    expect(parseDynamicFormFieldsJson(JSON.stringify({ id: "field" }))).toEqual([]);
    expect(() => parseDynamicFormFieldsJson("{bad json")).toThrow();
  });

  // テスト内容: 単一値の type guard が schema と同じ判定を使うことを確認する
  it("detects dynamic form field values", () => {
    expect(
      isDynamicFormField({
        id: "field-1",
        fieldKey: "amount",
        label: "金額",
        fieldType: "number",
      }),
    ).toBe(true);
    expect(isDynamicFormField({ id: "field-1", label: "金額" })).toBe(false);
  });
});
