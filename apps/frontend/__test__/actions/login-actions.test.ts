jest.mock("server-only", () => ({}));

jest.mock("@/lib/relay/client", () => ({
  client: {
    login: jest.fn(),
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    set: jest.fn(),
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { client } from "@/lib/relay/client";
import { login } from "@/app/login/actions";

const mockedLogin = jest.mocked(client.login);

function createLoginFormData(password = "wrongpassword"): FormData {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", password);
  return formData;
}

describe("login action", () => {
  beforeEach(() => {
    mockedLogin.mockReset();
  });

  // テスト内容: パスワード未入力時に Zod の英語メッセージではなく日本語の項目エラーを返すことを確認する
  it("returns a Japanese field error when password is empty", async () => {
    await expect(login(createLoginFormData(""))).resolves.toEqual({
      fieldErrors: {
        password: ["パスワードを入力してください。"],
      },
    });
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  // テスト内容: 認証情報が不正な場合、API の英語メッセージではなく日本語のフォームエラーを返すことを確認する
  it("returns a Japanese form error for invalid credentials", async () => {
    mockedLogin.mockResolvedValue({
      response: { ok: false, status: 401 },
      error: {
        statusCode: 401,
        errorCode: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });

    await expect(login(createLoginFormData())).resolves.toEqual({
      error: {
        message: "メールアドレスまたはパスワードが違います。",
      },
    });
  });

  // テスト内容: API 呼び出しが例外になっても production の Server Components エラー文を表示用に返さないことを確認する
  it("returns a Japanese fallback form error when the login request throws", async () => {
    mockedLogin.mockRejectedValue(
      new Error(
        "An error occurred in the Server Components render. The specific message is omitted in production builds.",
      ),
    );

    await expect(login(createLoginFormData())).resolves.toEqual({
      error: {
        message: "ログインに失敗しました。時間をおいて再度お試しください。",
      },
    });
  });
});
