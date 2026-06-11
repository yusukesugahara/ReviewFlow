import {
  asFieldType,
  linesToOptions,
  optionsToLines,
} from "@/components/application-setup/form-field-editor.helpers";

describe("form field editor helpers", () => {
  // テスト内容: 不正な項目タイプをテキスト入力へフォールバックすることを確認する
  it("normalizes field type values", () => {
    expect(asFieldType("select")).toBe("select");
    expect(asFieldType("unknown")).toBe("text");
  });

  // テスト内容: API由来の選択肢配列を編集用テキストへ変換することを確認する
  it("converts options to textarea lines", () => {
    expect(
      optionsToLines([
        { label: " 承認 ", value: "approve" },
        { value: " return " },
        " 却下 ",
        { label: " " },
        null,
      ]),
    ).toBe("承認\nreturn\n却下");
    expect(optionsToLines(null)).toBe("");
  });

  // テスト内容: 編集用テキストから空行と重複を除いて選択肢に戻すことを確認する
  it("converts textarea lines to unique options", () => {
    expect(linesToOptions("承認\n\n 差し戻し \n承認")).toEqual(["承認", "差し戻し"]);
  });
});
