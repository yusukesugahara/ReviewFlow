import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

const mockRedirect = jest.fn();
const mockGetCurrentSessionUser = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

jest.mock("next/image", () => {
  const React = require("react") as typeof import("react");
  return {
    __esModule: true,
    default: ({
      alt,
      className,
      src,
    }: {
      alt: string;
      className?: string;
      src: string;
    }) => React.createElement("img", { alt, className, src }),
  };
});

jest.mock("next/link", () => {
  const React = require("react") as typeof import("react");
  return {
    __esModule: true,
    default: ({
      children,
      className,
      href,
    }: {
      children: React.ReactNode;
      className?: string;
      href: string;
    }) => React.createElement("a", { className, href }, children),
  };
});

jest.mock("@/app/(authorized)/session/actions", () => ({
  getCurrentSessionUser: () => mockGetCurrentSessionUser(),
}));

describe("RootPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  // テスト内容: 未ログインユーザにはマーケティングトップを表示することを確認する
  it("renders the marketing home for anonymous users", async () => {
    mockGetCurrentSessionUser.mockResolvedValue(null);

    render(await RootPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "ReviewFlow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("修正が必要な申請を、迷わず受け取れる状態へ"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "具体的な利用シーン" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /申請者はログインやアカウント登録をしなくても、メールアドレス宛のリンクから申請できます/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "補助金・助成金の申請受付",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "施設利用・許可申請の確認",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "実際の画面" }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("ReviewFlow の公開申請フォーム入力画面"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/監査対応が必要な場面でも誰がいつ何をしたか/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "監査対応" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /アカウントを作成/ }),
    ).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2026 ReviewFlow. All rights reserved.",
    );
    expect(
      screen.getByRole("navigation", { name: "フッター内アカウントリンク" }),
    ).toHaveTextContent("ログイン");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // テスト内容: テナント管理者がスペース管理へリダイレクトされることを確認する
  it("redirects tenant admins to space administration", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_admin"],
    });

    await expect(RootPage()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/spaces",
    );

    expect(mockRedirect).toHaveBeenCalledWith("/admin/spaces");
  });

  // テスト内容: 管理者以外のユーザがスペースへリダイレクトされることを確認する
  it("redirects non-admin users to spaces", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      tenantId: "tenant-1",
      roles: ["tenant_user"],
    });

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT:/space");

    expect(mockRedirect).toHaveBeenCalledWith("/space");
  });
});
