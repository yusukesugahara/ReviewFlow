import { normalizeFieldOptions } from "@/components/applications/dynamic-fields/field-options";

describe("application field-options", () => {
  // テスト内容: 有効な選択肢を正規化し、不正な項目を無視することを確認する
  it("normalizes valid options and ignores invalid entries", () => {
    expect(
      normalizeFieldOptions([
        "one",
        { value: "two", label: "Two" },
        { value: "bad" },
        3,
        null,
      ]),
    ).toEqual([
      { value: "one", label: "one" },
      { value: "two", label: "Two" },
    ]);
  });

  // テスト内容: 配列でない値に空配列を返すことを確認する
  it("returns an empty array for non-array values", () => {
    expect(normalizeFieldOptions(undefined)).toEqual([]);
    expect(normalizeFieldOptions(null)).toEqual([]);
  });
});
