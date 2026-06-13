import { validateRequiredDynamicFields } from "@/components/applications/dynamic-fields/dynamic-field-validation";
import type { DynamicFormField } from "@/components/applications/dynamic-fields/dynamic-fields";

describe("dynamic field validation", () => {
  const fields: DynamicFormField[] = [
    { id: "name", fieldKey: "name", label: "名前", fieldType: "text", required: true },
    { id: "amount", fieldKey: "amount", label: "金額", fieldType: "number", required: true },
    { id: "agree", fieldKey: "agree", label: "同意", fieldType: "consent", required: true },
    { id: "roles", fieldKey: "roles", label: "ロール", fieldType: "checkbox", required: true },
  ];

  // テスト内容: required 値が存在する場合はエラーを返さないことを確認する
  it("accepts present required values", () => {
    expect(
      validateRequiredDynamicFields(fields, {
        name: " Alice ",
        amount: 0,
        agree: false,
        roles: ["admin"],
      }),
    ).toEqual({ fieldErrors: {}, missingFieldLabels: [] });
  });

  // テスト内容: 空文字、非有限数、空配列を missing として扱うことを確認する
  it("returns field errors and missing labels", () => {
    expect(
      validateRequiredDynamicFields(fields, {
        name: "   ",
        amount: Number.NaN,
        agree: true,
        roles: [],
      }),
    ).toEqual({
      fieldErrors: {
        name: "必須項目です",
        amount: "必須項目です",
        roles: "必須項目です",
      },
      missingFieldLabels: ["名前", "金額", "ロール"],
    });
  });
});
