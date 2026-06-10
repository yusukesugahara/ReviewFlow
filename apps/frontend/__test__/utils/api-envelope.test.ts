jest.mock("server-only", () => ({}));

function captureThrownValue(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected function to throw");
}

describe("api envelope helpers", () => {
  // テスト内容: 成功エンベロープからdataを取り出せることを確認する
  it("unwraps data from successful responses", async () => {
    const { unwrapResponseData } = await import("@/lib/server/api-envelope");

    expect(
      unwrapResponseData<{ id: string }>({
        response: { ok: true, status: 200 },
        data: { status: 200, data: { id: "item-1" } },
      }),
    ).toEqual({ id: "item-1" });
  });

  // テスト内容: 不正な成功エンベロープで例外が発生することを確認する
  it("throws for invalid success envelopes", async () => {
    const { unwrapResponseData } = await import("@/lib/server/api-envelope");

    expect(() =>
      unwrapResponseData({
        response: { ok: true, status: 200 },
        data: { status: 200 },
      }),
    ).toThrow("invalid success envelope");
  });

  // テスト内容: response-like object の成功時だけ envelope data を取り出すことを確認する
  it("throws API failure for failed responses", async () => {
    const { unwrapResponseData } = await import("@/lib/server/api-envelope");

    expect(
      captureThrownValue(() =>
        unwrapResponseData({
          response: { ok: false, status: 404 },
          error: { message: "not found" },
        }),
      ),
    ).toEqual({ status: 404, body: { message: "not found" } });
  });
});
