import {
  parseAuthLoginSuccess,
  parseAuthMeSuccess,
  parseAuthRegisterSuccess,
} from "@/lib/server/auth-response-schema";

describe("auth response schema", () => {
  // テスト内容: login/register の token 発行レスポンスを parse できることを確認する
  it("parses login and register success responses", () => {
    const login = { status: 200, data: { access_token: "token-1" } };
    const register = { status: 201, data: { access_token: "token-2" } };

    expect(parseAuthLoginSuccess(login)).toEqual(login);
    expect(parseAuthRegisterSuccess(register)).toEqual(register);
  });

  // テスト内容: /auth/me の成功レスポンスを parse できることを確認する
  it("parses auth me success responses", () => {
    const response = {
      status: 200,
      data: {
        id: "user-1",
        email: "user@example.com",
        name: "User Name",
        tenantId: "tenant-1",
        roles: ["tenant_admin"],
      },
    };

    expect(parseAuthMeSuccess(response)).toEqual(response);
  });

  // テスト内容: 不正なレスポンスは null になることを確認する
  it("returns null for invalid responses", () => {
    expect(parseAuthLoginSuccess({ status: 200, data: {} })).toBeNull();
    expect(parseAuthRegisterSuccess({ status: 400, data: { access_token: "x" } })).toBeNull();
    expect(parseAuthMeSuccess({ status: 200, data: { roles: [1] } })).toBeNull();
  });
});
