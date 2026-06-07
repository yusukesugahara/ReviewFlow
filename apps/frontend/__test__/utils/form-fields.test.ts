import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  fieldTypeStoresValue,
  fieldTypeSupportsPlaceholder,
  isFieldType,
} from "@/lib/constants/form-fields";

describe("form-fields", () => {
  // テスト内容: 対応しているフィールド種別を判定できることを確認する
  it("identifies supported field types", () => {
    expect(isFieldType(FIELD_TYPES.text)).toBe(true);
    expect(isFieldType("unknown")).toBe(false);
  });

  // テスト内容: 選択肢が必要なフィールド種別を判定できることを確認する
  it("detects field types that require options", () => {
    expect(fieldTypeNeedsOptions(FIELD_TYPES.select)).toBe(true);
    expect(fieldTypeNeedsOptions(FIELD_TYPES.radio)).toBe(true);
    expect(fieldTypeNeedsOptions(FIELD_TYPES.checkbox)).toBe(true);
    expect(fieldTypeNeedsOptions(FIELD_TYPES.text)).toBe(false);
  });

  // テスト内容: 入力例表示への対応と値保持の可否を判定できることを確認する
  it("detects placeholder and value support", () => {
    expect(fieldTypeSupportsPlaceholder(FIELD_TYPES.textarea)).toBe(true);
    expect(fieldTypeSupportsPlaceholder(FIELD_TYPES.checkbox)).toBe(false);
    expect(fieldTypeStoresValue(FIELD_TYPES.description)).toBe(false);
    expect(fieldTypeStoresValue(FIELD_TYPES.section)).toBe(false);
    expect(fieldTypeStoresValue(FIELD_TYPES.consent)).toBe(true);
  });
});
