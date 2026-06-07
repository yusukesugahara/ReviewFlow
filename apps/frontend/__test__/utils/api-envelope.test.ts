jest.mock("server-only", () => ({}));

describe("api envelope helpers", () => {
  // テスト内容: 成功エンベロープからdataを取り出せることを確認する
  it("unwraps data from success envelopes", async () => {
    const { unwrapData } = await import("@/lib/server/api-envelope");

    expect(unwrapData<{ id: string }>({ status: 200, data: { id: "item-1" } })).toEqual({
      id: "item-1",
    });
  });

  // テスト内容: 不正な成功エンベロープで例外が発生することを確認する
  it("throws for invalid success envelopes", async () => {
    const { unwrapData } = await import("@/lib/server/api-envelope");

    expect(() => unwrapData(null)).toThrow("invalid success envelope");
    expect(() => unwrapData({ status: 200 })).toThrow("invalid success envelope");
  });
});
