import { createDefaultField } from "@/components/application-setup/fields/application-setup-fields";
import { toFieldPayloads } from "@/app/(authorized)/space/application-setup/application-setup-payload";

describe("application setup payload", () => {
  // テスト内容: UI プレビューと送信 payload が同じ fieldKey / options 正規化を使うことを確認する
  it("normalizes field payloads using shared draft field rules", () => {
    expect(
      toFieldPayloads([
        {
          ...createDefaultField(0),
          fieldKey: "amount",
          fieldType: "select",
          label: "金額",
          optionsText: "A\n\nB\nA",
        },
        {
          ...createDefaultField(1),
          label: "Amount",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        fieldKey: "amount",
        label: "金額",
        options: [
          { label: "A", value: "A" },
          { label: "B", value: "B" },
        ],
        sortOrder: 0,
      }),
      expect.objectContaining({
        fieldKey: "amount_2",
        label: "Amount",
        options: [],
        sortOrder: 1,
      }),
    ]);
  });
});
