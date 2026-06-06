import { formatDateJa, formatDateTimeJa } from "@/lib/date-format";

describe("date-format", () => {
  // テスト内容: 日付が日本時間で整形されることを確認する
  it("formats dates in Japan time", () => {
    expect(formatDateJa("2026-06-06T00:00:00.000Z")).toBe("2026/6/6");
  });

  // テスト内容: 日時が日本時間で整形されることを確認する
  it("formats date-times in Japan time", () => {
    expect(formatDateTimeJa("2026-06-06T00:00:00.000Z")).toBe("2026/6/6 09:00");
  });

  // テスト内容: 不正な日付にはプレースホルダーが返ることを確認する
  it("returns a placeholder for invalid dates", () => {
    expect(formatDateJa("invalid")).toBe("-");
    expect(formatDateTimeJa("invalid")).toBe("-");
  });
});
