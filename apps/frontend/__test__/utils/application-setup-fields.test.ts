import {
  createDefaultField,
  fieldOptionsFromText,
  normalizeFieldKey,
  optionLines,
  toDynamicField,
} from "@/components/application-setup/fields/application-setup-fields";

describe("application setup fields", () => {
  // テスト内容: 既定のフォーム項目が一貫した初期値で作成されることを確認する
  it("creates default fields with predictable values", () => {
    expect(createDefaultField(0)).toMatchObject({
      id: "field-1",
      label: "フォーム1",
      fieldType: "text",
      required: true,
    });
  });

  // テスト内容: 選択肢の空行と重複が取り除かれることを確認する
  it("normalizes option lines", () => {
    expect(optionLines("承認\n\n差し戻し\n承認")).toEqual(["承認", "差し戻し"]);
    expect(fieldOptionsFromText("承認\n\n差し戻し\n承認")).toEqual([
      { label: "承認", value: "承認" },
      { label: "差し戻し", value: "差し戻し" },
    ]);
  });

  // テスト内容: 明示キーとラベル由来キーが重複しないよう正規化されることを確認する
  it("normalizes field keys without duplicates", () => {
    const usedKeys = new Set<string>();

    expect(
      normalizeFieldKey(
        { ...createDefaultField(0), fieldKey: "amount" },
        0,
        usedKeys,
      ),
    ).toBe("amount");
    expect(normalizeFieldKey({ ...createDefaultField(1), label: "Amount" }, 1, usedKeys)).toBe(
      "amount_2",
    );
  });

  // テスト内容: 下書き項目が動的フォーム表示用の項目へ変換されることを確認する
  it("converts draft fields to dynamic fields", () => {
    expect(
      toDynamicField(
        {
          ...createDefaultField(0),
          fieldType: "select",
          optionsText: "A\nB",
          placeholder: "選択してください",
          helpText: "説明",
        },
        0,
        "choice",
      ),
    ).toMatchObject({
      fieldKey: "choice",
      label: "フォーム1",
      options: [
        { label: "A", value: "A" },
        { label: "B", value: "B" },
      ],
      placeholder: "選択してください",
      helpText: "説明",
    });
  });
});
