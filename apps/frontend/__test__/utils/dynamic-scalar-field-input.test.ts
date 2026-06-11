import { formatNumberDisplayValue } from "@/components/applications/dynamic-scalar-field-input";

describe("dynamic scalar field input", () => {
  // テスト内容: 読み取り専用の数値表示で桁区切りが適用されることを確認する
  it("formats readonly number values", () => {
    expect(formatNumberDisplayValue("1234567")).toBe("1,234,567");
    expect(formatNumberDisplayValue(" 1000.5 ")).toBe("1,000.5");
  });

  // テスト内容: 空値と数値以外は入力値を壊さないことを確認する
  it("preserves blank and invalid number values", () => {
    expect(formatNumberDisplayValue("")).toBe("");
    expect(formatNumberDisplayValue("abc")).toBe("abc");
  });
});
