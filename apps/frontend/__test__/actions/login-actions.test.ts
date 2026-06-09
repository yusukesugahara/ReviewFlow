jest.mock("server-only", () => ({}));

jest.mock("@/lib/server/backend-fetch", () => ({
  client: {
    POST: jest.fn(),
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

import { client } from "@/lib/server/backend-fetch";
import { login } from "@/app/login/actions";

const mockedPost = jest.mocked(client.POST);

function createLoginFormData(password = "wrongpassword"): FormData {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", password);
  return formData;
}

describe("login action", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  // テスト内容: 認証情報が不正な場合、API の英語メッセージではなく日本語のフォームエラーを返すことを確認する
  it("returns a Japanese form error for invalid credentials", async () => {
    mockedPost.mockResolvedValue({
      response: { ok: false, status: 401 },
      error: {
        statusCode: 401,
        errorCode: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });

    await expect(login(createLoginFormData())).resolves.toEqual({
      error: {
        message: "メールアドレスまたはパスワードが正しくありません。",
      },
    });
  });

  // テスト内容: API 呼び出しが例外になっても production の Server Components エラー文を表示用に返さないことを確認する
  it("returns a Japanese fallback form error when the login request throws", async () => {
    mockedPost.mockRejectedValue(
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
