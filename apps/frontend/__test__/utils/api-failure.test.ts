import {
  errorMessageFromBody,
  isApiFailure,
  throwIfApiResponseFailed,
  toApiFailure,
} from "@/lib/server/api-failure";

function captureThrownValue(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected function to throw");
}

describe("api failure helpers", () => {
  // テスト内容: API failure の shape を判定できることを確認する
  it("detects API failure shapes", () => {
    expect(isApiFailure({ status: 400, body: { message: "bad request" } })).toBe(true);
    expect(isApiFailure({ status: "400" })).toBe(false);
    expect(isApiFailure(null)).toBe(false);
  });

  // テスト内容: string / string[] の message を取り出せることを確認する
  it("extracts messages from response bodies", () => {
    expect(errorMessageFromBody({ message: "入力内容を確認してください" })).toBe(
      "入力内容を確認してください",
    );
    expect(errorMessageFromBody({ message: ["a", "b"] })).toBe("a, b");
    expect(
      errorMessageFromBody([
        { message: "Field value does not match the field type" },
        { message: "Required fields must be filled before submit" },
      ]),
    ).toBe(
      "Field value does not match the field type, Required fields must be filled before submit",
    );
  });

  // テスト内容: message がない場合は fallback を返すことを確認する
  it("returns fallback when no usable message exists", () => {
    expect(errorMessageFromBody({ message: "" }, "fallback")).toBe("fallback");
    expect(errorMessageFromBody("invalid", "fallback")).toBe("fallback");
  });

  // テスト内容: backend API client のレスポンス形状から API failure を作れることを確認する
  it("builds API failure from response-like objects", () => {
    expect(
      toApiFailure({
        response: { ok: false, status: 403 },
        error: { message: "forbidden" },
      }),
    ).toEqual({
      status: 403,
      body: { message: "forbidden" },
    });
  });

  // テスト内容: failed response だけ例外化することを確認する
  it("throws only when response failed", () => {
    expect(() =>
      throwIfApiResponseFailed({
        response: { ok: true, status: 200 },
        data: { status: 200, data: { ok: true } },
      }),
    ).not.toThrow();

    expect(
      captureThrownValue(() =>
        throwIfApiResponseFailed({
          response: { ok: false, status: 500 },
          error: { message: "failed" },
        }),
      ),
    ).toEqual({ status: 500, body: { message: "failed" } });
  });
});
