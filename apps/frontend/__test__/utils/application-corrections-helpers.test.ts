import {
  formatCorrectionSubmittedValue,
  formatFieldKeyLabel,
  getCorrectionItemLabel,
} from "@/components/applications/corrections/application-corrections.helpers";
import type { ApplicationFormField } from "@/components/applications/detail/application-detail.types";

const fields: ApplicationFormField[] = [
  {
    id: "field-1",
    fieldKey: "certificate_type",
    label: "証明書種別",
    fieldType: "select",
    options: [
      { value: "resident_record", label: "住民票の写し" },
      { value: "deleted_record", label: "除票の写し" },
    ],
  },
];

describe("application correction helpers", () => {
  // テスト内容: fieldKey の機械名を履歴表示用ラベルへ変換できることを確認する
  it("formats fallback field key labels", () => {
    expect(formatFieldKeyLabel("procedure_type")).toBe("手続き種別");
    expect(formatFieldKeyLabel("custom_field")).toBe("customfield");
  });

  // テスト内容: 差し戻し項目のラベルをフォーム項目から解決できることを確認する
  it("resolves correction item labels from form fields", () => {
    expect(
      getCorrectionItemLabel(
        { fieldKey: "procedure_type", formFieldId: "field-1" },
        fields,
      ),
    ).toBe("証明書種別");
    expect(
      getCorrectionItemLabel(
        { fieldKey: "procedure_type", formFieldId: "missing" },
        fields,
      ),
    ).toBe("手続き種別");
  });

  // テスト内容: 差し戻し履歴に表示する申請値をフォーム項目定義に従って整形できることを確認する
  it("formats submitted values for correction history", () => {
    expect(
      formatCorrectionSubmittedValue({
        fields,
        item: {
          comment: "確認してください",
          fieldKey: "certificate_type",
          formFieldId: "field-1",
        },
        values: { certificate_type: "resident_record" },
      }),
    ).toBe("住民票の写し");
    expect(
      formatCorrectionSubmittedValue({
        fields,
        item: {
          comment: "確認してください",
          fieldKey: "unknown_field",
          formFieldId: "missing",
        },
        values: { unknown_field: "自由入力" },
      }),
    ).toBe("自由入力");
  });
});
